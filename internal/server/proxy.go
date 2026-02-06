package server

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/cli/go-gh/v2/pkg/api"
)

type proxyHandler struct {
	restClient *api.RESTClient
}

func newProxyHandler() (*proxyHandler, error) {
	client, err := api.DefaultRESTClient()
	if err != nil {
		return nil, err
	}
	return &proxyHandler{restClient: client}, nil
}

func (h *proxyHandler) ServeRESTProxy(w http.ResponseWriter, r *http.Request) {
	// Extract path after /api/github/rest/
	path := strings.TrimPrefix(r.URL.Path, "/api/github/rest/")
	if path == "" {
		http.Error(w, "path required", http.StatusBadRequest)
		return
	}

	// Add query string if present
	if r.URL.RawQuery != "" {
		path = path + "?" + r.URL.RawQuery
	}

	var response any
	var err error

	switch r.Method {
	case http.MethodGet:
		err = h.restClient.Get(path, &response)
	case http.MethodPost:
		body, readErr := io.ReadAll(r.Body)
		if readErr != nil {
			http.Error(w, "failed to read body", http.StatusBadRequest)
			return
		}
		var bodyReader io.Reader
		if len(body) > 0 {
			bodyReader = bytes.NewReader(body)
		}
		err = h.restClient.Post(path, bodyReader, &response)
	case http.MethodPatch:
		body, readErr := io.ReadAll(r.Body)
		if readErr != nil {
			http.Error(w, "failed to read body", http.StatusBadRequest)
			return
		}
		var bodyReader io.Reader
		if len(body) > 0 {
			bodyReader = bytes.NewReader(body)
		}
		err = h.restClient.Patch(path, bodyReader, &response)
	case http.MethodDelete:
		err = h.restClient.Delete(path, &response)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err != nil {
		handleAPIError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *proxyHandler) ServeGraphQLProxy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}

	if len(body) == 0 {
		http.Error(w, "request body required", http.StatusBadRequest)
		return
	}

	var response any
	err = h.restClient.Post("graphql", bytes.NewReader(body), &response)
	if err != nil {
		handleAPIError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleAPIError(w http.ResponseWriter, err error) {
	if httpErr, ok := err.(*api.HTTPError); ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(httpErr.StatusCode)
		json.NewEncoder(w).Encode(map[string]any{
			"error":   httpErr.Message,
			"status":  httpErr.StatusCode,
			"details": httpErr.Errors,
		})
		return
	}
	http.Error(w, err.Error(), http.StatusInternalServerError)
}
