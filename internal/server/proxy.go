package server

import (
	"net/http"
	"net/http/httputil"
	"strings"

	"github.com/cli/go-gh/v2/pkg/auth"
)

type proxyHandler struct {
	proxy      *httputil.ReverseProxy
	pathPrefix string // "" for github.com, "/api/v3" for GHE
}

func newProxyHandler() (*proxyHandler, error) {
	host, _ := auth.DefaultHost()
	token, _ := auth.TokenForHost(host)
	apiHost, pathPrefix := resolveGitHubAPI(host)

	return newProxyHandlerWith("https", apiHost, pathPrefix, token), nil
}

// newProxyHandlerWith creates a proxyHandler with explicit configuration.
// Exported for testing.
func newProxyHandlerWith(scheme, apiHost, pathPrefix, token string) *proxyHandler {
	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = scheme
			req.URL.Host = apiHost
			req.Host = apiHost
			if token != "" {
				req.Header.Set("Authorization", "token " + token)
			}
		},
	}

	return &proxyHandler{proxy: proxy, pathPrefix: pathPrefix}
}

// resolveGitHubAPI returns the API host and path prefix for the given GitHub host.
// For github.com, the API is at api.github.com with no prefix.
// For GHE, the API is at the same host with /api/v3 prefix.
func resolveGitHubAPI(host string) (apiHost string, pathPrefix string) {
	if host == "" || host == "github.com" {
		return "api.github.com", ""
	}
	return host, "/api/v3"
}

func (h *proxyHandler) ServeRESTProxy(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/github/rest/")
	if path == "" {
		http.Error(w, "path required", http.StatusBadRequest)
		return
	}
	r.URL.Path = h.pathPrefix + "/" + path
	h.proxy.ServeHTTP(w, r)
}

func (h *proxyHandler) ServeGraphQLProxy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.Body == nil || r.Body == http.NoBody || r.ContentLength == 0 {
		http.Error(w, "request body required", http.StatusBadRequest)
		return
	}
	r.URL.Path = h.pathPrefix + "/graphql"
	h.proxy.ServeHTTP(w, r)
}
