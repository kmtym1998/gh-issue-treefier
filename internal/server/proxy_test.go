package server

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestResolveGitHubAPI(t *testing.T) {
	tests := []struct {
		name           string
		host           string
		wantAPIHost    string
		wantPathPrefix string
	}{
		{
			name:           "github.com",
			host:           "github.com",
			wantAPIHost:    "api.github.com",
			wantPathPrefix: "",
		},
		{
			name:           "empty host defaults to github.com",
			host:           "",
			wantAPIHost:    "api.github.com",
			wantPathPrefix: "",
		},
		{
			name:           "GHE host",
			host:           "github.example.com",
			wantAPIHost:    "github.example.com",
			wantPathPrefix: "/api/v3",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			apiHost, pathPrefix := resolveGitHubAPI(tt.host)
			if apiHost != tt.wantAPIHost {
				t.Errorf("apiHost = %q, want %q", apiHost, tt.wantAPIHost)
			}
			if pathPrefix != tt.wantPathPrefix {
				t.Errorf("pathPrefix = %q, want %q", pathPrefix, tt.wantPathPrefix)
			}
		})
	}
}

// newMockHandler creates a proxyHandler pointing to the given test server.
func newMockHandler(t *testing.T, mock *httptest.Server, pathPrefix string) *proxyHandler {
	t.Helper()
	host := strings.TrimPrefix(mock.URL, "http://")
	return newProxyHandlerWith("http", host, pathPrefix, "test-token")
}

func TestServeRESTProxy_ForwardsRequest(t *testing.T) {
	var received struct {
		path, query, auth, method string
	}

	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received.path = r.URL.Path
		received.query = r.URL.RawQuery
		received.auth = r.Header.Get("Authorization")
		received.method = r.Method
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-RateLimit-Remaining", "42")
		w.Write([]byte(`{"full_name":"owner/repo"}`))
	}))
	defer mock.Close()

	handler := newMockHandler(t, mock, "")

	req := httptest.NewRequest(http.MethodGet, "/api/github/rest/repos/owner/repo?per_page=10", nil)
	w := httptest.NewRecorder()

	handler.ServeRESTProxy(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	if received.path != "/repos/owner/repo" {
		t.Errorf("path = %q, want /repos/owner/repo", received.path)
	}
	if received.query != "per_page=10" {
		t.Errorf("query = %q, want per_page=10", received.query)
	}
	if received.auth != "token test-token" {
		t.Errorf("auth = %q, want 'token test-token'", received.auth)
	}
	if received.method != http.MethodGet {
		t.Errorf("method = %q, want GET", received.method)
	}
	// Verify response headers are forwarded transparently
	if w.Header().Get("X-RateLimit-Remaining") != "42" {
		t.Errorf("X-RateLimit-Remaining = %q, want '42'", w.Header().Get("X-RateLimit-Remaining"))
	}
	if !strings.Contains(w.Body.String(), "owner/repo") {
		t.Errorf("body = %q, want it to contain 'owner/repo'", w.Body.String())
	}
}

func TestServeRESTProxy_POST(t *testing.T) {
	var receivedBody string
	var receivedMethod string

	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedMethod = r.Method
		b, _ := io.ReadAll(r.Body)
		receivedBody = string(b)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":1}`))
	}))
	defer mock.Close()

	handler := newMockHandler(t, mock, "")

	body := `{"title":"new issue"}`
	req := httptest.NewRequest(http.MethodPost, "/api/github/rest/repos/owner/repo/issues", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.ServeRESTProxy(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201", w.Code)
	}
	if receivedMethod != http.MethodPost {
		t.Errorf("method = %q, want POST", receivedMethod)
	}
	if !strings.Contains(receivedBody, "new issue") {
		t.Errorf("body = %q, want it to contain 'new issue'", receivedBody)
	}
}

func TestServeRESTProxy_GHEPathPrefix(t *testing.T) {
	var receivedPath string

	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPath = r.URL.Path
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{}`))
	}))
	defer mock.Close()

	handler := newMockHandler(t, mock, "/api/v3")

	req := httptest.NewRequest(http.MethodGet, "/api/github/rest/repos/owner/repo", nil)
	w := httptest.NewRecorder()

	handler.ServeRESTProxy(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	if receivedPath != "/api/v3/repos/owner/repo" {
		t.Errorf("path = %q, want /api/v3/repos/owner/repo", receivedPath)
	}
}

func TestServeRESTProxy_EmptyPath(t *testing.T) {
	handler := newProxyHandlerWith("http", "localhost", "", "token")

	req := httptest.NewRequest(http.MethodGet, "/api/github/rest/", nil)
	w := httptest.NewRecorder()

	handler.ServeRESTProxy(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

func TestServeRESTProxy_ErrorResponse(t *testing.T) {
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"message":"Not Found"}`))
	}))
	defer mock.Close()

	handler := newMockHandler(t, mock, "")

	req := httptest.NewRequest(http.MethodGet, "/api/github/rest/repos/owner/nonexistent", nil)
	w := httptest.NewRecorder()

	handler.ServeRESTProxy(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", w.Code)
	}
	if !strings.Contains(w.Body.String(), "Not Found") {
		t.Errorf("body = %q, want it to contain 'Not Found'", w.Body.String())
	}
}

func TestServeGraphQLProxy_ForwardsRequest(t *testing.T) {
	var received struct {
		path, auth, body string
	}

	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received.path = r.URL.Path
		received.auth = r.Header.Get("Authorization")
		b, _ := io.ReadAll(r.Body)
		received.body = string(b)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":{"viewer":{"login":"testuser"}}}`))
	}))
	defer mock.Close()

	handler := newMockHandler(t, mock, "")

	body := `{"query":"{ viewer { login } }"}`
	req := httptest.NewRequest(http.MethodPost, "/api/github/graphql", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.ServeGraphQLProxy(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	if received.path != "/graphql" {
		t.Errorf("path = %q, want /graphql", received.path)
	}
	if received.auth != "token test-token" {
		t.Errorf("auth = %q, want 'token test-token'", received.auth)
	}
	if !strings.Contains(received.body, "viewer") {
		t.Errorf("body = %q, want it to contain 'viewer'", received.body)
	}

	var got map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	data := got["data"].(map[string]any)
	viewer := data["viewer"].(map[string]any)
	if viewer["login"] != "testuser" {
		t.Errorf("login = %v, want 'testuser'", viewer["login"])
	}
}

func TestServeGraphQLProxy_GHEPathPrefix(t *testing.T) {
	var receivedPath string

	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPath = r.URL.Path
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{}`))
	}))
	defer mock.Close()

	handler := newMockHandler(t, mock, "/api/v3")

	body := `{"query":"{ viewer { login } }"}`
	req := httptest.NewRequest(http.MethodPost, "/api/github/graphql", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.ServeGraphQLProxy(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	if receivedPath != "/api/v3/graphql" {
		t.Errorf("path = %q, want /api/v3/graphql", receivedPath)
	}
}

func TestServeGraphQLProxy_MethodNotAllowed(t *testing.T) {
	handler := newProxyHandlerWith("http", "localhost", "", "token")

	req := httptest.NewRequest(http.MethodGet, "/api/github/graphql", nil)
	w := httptest.NewRecorder()

	handler.ServeGraphQLProxy(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want 405", w.Code)
	}
}

func TestServeGraphQLProxy_EmptyBody(t *testing.T) {
	handler := newProxyHandlerWith("http", "localhost", "", "token")

	req := httptest.NewRequest(http.MethodPost, "/api/github/graphql", nil)
	w := httptest.NewRecorder()

	handler.ServeGraphQLProxy(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
	if !strings.Contains(w.Body.String(), "request body required") {
		t.Errorf("body = %q, want it to contain 'request body required'", w.Body.String())
	}
}

func TestServeGraphQLProxy_ErrorResponse(t *testing.T) {
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"message":"Bad credentials"}`))
	}))
	defer mock.Close()

	handler := newMockHandler(t, mock, "")

	body := `{"query":"{ viewer { login } }"}`
	req := httptest.NewRequest(http.MethodPost, "/api/github/graphql", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.ServeGraphQLProxy(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
	if !strings.Contains(w.Body.String(), "Bad credentials") {
		t.Errorf("body = %q, want it to contain 'Bad credentials'", w.Body.String())
	}
}
