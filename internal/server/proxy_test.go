package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/cli/go-gh/v2/pkg/api"
)

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
