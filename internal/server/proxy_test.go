package server

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/cli/go-gh/v2/pkg/api"
)

// newTestProxyHandler creates a proxyHandler whose REST client sends all
// requests to the given httptest.Server instead of api.github.com.
func newTestProxyHandler(t *testing.T, server *httptest.Server) *proxyHandler {
	t.Helper()
	client, err := api.NewRESTClient(api.ClientOptions{
		AuthToken: "test-token",
		Transport: &redirectTransport{target: server},
	})
	if err != nil {
		t.Fatalf("failed to create test client: %v", err)
	}
	return &proxyHandler{restClient: client}
}

// redirectTransport rewrites every outgoing request so that it hits the
// httptest.Server instead of the real GitHub API.
type redirectTransport struct {
	target *httptest.Server
}

func (rt *redirectTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req = req.Clone(req.Context())
	req.URL.Scheme = "http"
	req.URL.Host = strings.TrimPrefix(rt.target.URL, "http://")
	return http.DefaultTransport.RoundTrip(req)
}

func TestHandleAPIError(t *testing.T) {
	tests := []struct {
		name           string
		err            error
		wantStatus     int
		wantContains   string
	}{
		{
			name: "HTTP error 401",
			err: &api.HTTPError{
				StatusCode: 401,
				Message:    "Bad credentials",
			},
			wantStatus:   401,
			wantContains: "Bad credentials",
		},
		{
			name: "HTTP error 404",
			err: &api.HTTPError{
				StatusCode: 404,
				Message:    "Not Found",
			},
			wantStatus:   404,
			wantContains: "Not Found",
		},
		{
			name: "HTTP error 429",
			err: &api.HTTPError{
				StatusCode: 429,
				Message:    "rate limit exceeded",
			},
			wantStatus:   429,
			wantContains: "rate limit",
		},
		{
			name:         "generic error",
			err:          &genericError{msg: "connection failed"},
			wantStatus:   500,
			wantContains: "connection failed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			handleAPIError(w, tt.err)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tt.wantStatus)
			}

			body := w.Body.String()
			if !strings.Contains(body, tt.wantContains) {
				t.Errorf("body does not contain %q, got: %s", tt.wantContains, body)
			}
		})
	}
}

type genericError struct {
	msg string
}

func (e *genericError) Error() string {
	return e.msg
}

func TestServeRESTProxy_PathExtraction(t *testing.T) {
	// Test that path is correctly extracted
	tests := []struct {
		name       string
		path       string
		query      string
		wantPath   string
	}{
		{
			name:     "simple path",
			path:     "/api/github/rest/repos/owner/repo",
			wantPath: "repos/owner/repo",
		},
		{
			name:     "path with query",
			path:     "/api/github/rest/repos/owner/repo/issues",
			query:    "state=open&per_page=10",
			wantPath: "repos/owner/repo/issues?state=open&per_page=10",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := strings.TrimPrefix(tt.path, "/api/github/rest/")
			if tt.query != "" {
				path = path + "?" + tt.query
			}

			if path != tt.wantPath {
				t.Errorf("path = %q, want %q", path, tt.wantPath)
			}
		})
	}
}

func TestServeRESTProxy_EmptyPath(t *testing.T) {
	handler := &proxyHandler{}

	req := httptest.NewRequest(http.MethodGet, "/api/github/rest/", nil)
	w := httptest.NewRecorder()

	handler.ServeRESTProxy(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestServeRESTProxy_MethodNotAllowed(t *testing.T) {
	handler := &proxyHandler{}

	req := httptest.NewRequest(http.MethodPut, "/api/github/rest/repos/owner/repo", nil)
	w := httptest.NewRecorder()

	handler.ServeRESTProxy(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want %d", w.Code, http.StatusMethodNotAllowed)
	}
}

func TestHandleAPIError_JSONResponse(t *testing.T) {
	w := httptest.NewRecorder()
	err := &api.HTTPError{
		StatusCode: 404,
		Message:    "Not Found",
		Errors:     []api.HTTPErrorItem{{Message: "repo not found"}},
	}

	handleAPIError(w, err)

	var response map[string]any
	if jsonErr := json.Unmarshal(w.Body.Bytes(), &response); jsonErr != nil {
		t.Fatalf("failed to parse response: %v", jsonErr)
	}

	if response["error"] != "Not Found" {
		t.Errorf("error = %v, want 'Not Found'", response["error"])
	}

	if response["status"] != float64(404) {
		t.Errorf("status = %v, want 404", response["status"])
	}
}

func TestServeGraphQLProxy_MethodNotAllowed(t *testing.T) {
	handler := &proxyHandler{}

	req := httptest.NewRequest(http.MethodGet, "/api/github/graphql", nil)
	w := httptest.NewRecorder()

	handler.ServeGraphQLProxy(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want %d", w.Code, http.StatusMethodNotAllowed)
	}
}

func TestServeGraphQLProxy_EmptyBody(t *testing.T) {
	handler := &proxyHandler{}

	req := httptest.NewRequest(http.MethodPost, "/api/github/graphql", nil)
	w := httptest.NewRecorder()

	handler.ServeGraphQLProxy(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}

	if !strings.Contains(w.Body.String(), "request body required") {
		t.Errorf("expected 'request body required' in response, got: %s", w.Body.String())
	}
}

func TestServeGraphQLProxy_ForwardsRequestBody(t *testing.T) {
	var receivedBody string
	var receivedPath string
	var receivedContentType string

	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPath = r.URL.Path
		receivedContentType = r.Header.Get("Content-Type")
		b, _ := io.ReadAll(r.Body)
		receivedBody = string(b)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":{"viewer":{"login":"testuser"}}}`))
	}))
	defer mock.Close()

	handler := newTestProxyHandler(t, mock)

	body := `{"query":"{ viewer { login } }"}`
	req := httptest.NewRequest(http.MethodPost, "/api/github/graphql", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.ServeGraphQLProxy(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusOK)
	}

	// Verify the request was forwarded to the /api/graphql path
	if !strings.HasSuffix(receivedPath, "/graphql") {
		t.Errorf("received path = %q, want suffix /graphql", receivedPath)
	}

	// Verify the request body was forwarded
	if !strings.Contains(receivedBody, `viewer`) {
		t.Errorf("received body = %q, want it to contain 'viewer'", receivedBody)
	}

	// Verify content-type was set
	if receivedContentType == "" {
		t.Error("expected Content-Type header to be set")
	}
}

func TestServeGraphQLProxy_ReturnsResponse(t *testing.T) {
	wantData := map[string]any{
		"data": map[string]any{
			"repository": map[string]any{
				"name": "test-repo",
			},
		},
	}

	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(wantData)
	}))
	defer mock.Close()

	handler := newTestProxyHandler(t, mock)

	body := `{"query":"{ repository(owner:\"o\", name:\"r\") { name } }"}`
	req := httptest.NewRequest(http.MethodPost, "/api/github/graphql", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.ServeGraphQLProxy(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusOK)
	}

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}

	var got map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	data, ok := got["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected 'data' key in response, got: %v", got)
	}
	repo, ok := data["repository"].(map[string]any)
	if !ok {
		t.Fatalf("expected 'repository' key, got: %v", data)
	}
	if repo["name"] != "test-repo" {
		t.Errorf("name = %v, want 'test-repo'", repo["name"])
	}
}

func TestServeGraphQLProxy_APIError(t *testing.T) {
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"message":"Bad credentials"}`))
	}))
	defer mock.Close()

	handler := newTestProxyHandler(t, mock)

	body := `{"query":"{ viewer { login } }"}`
	req := httptest.NewRequest(http.MethodPost, "/api/github/graphql", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.ServeGraphQLProxy(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}

	respBody := w.Body.String()
	if !strings.Contains(respBody, "Bad credentials") {
		t.Errorf("response body = %q, want it to contain 'Bad credentials'", respBody)
	}
}
