package server

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSPAHandler(t *testing.T) {
	handler := newSPAHandler()
	server := httptest.NewServer(handler)
	defer server.Close()

	tests := []struct {
		name         string
		path         string
		wantStatus   int
		wantContains string
	}{
		{
			name:         "root returns index.html",
			path:         "/",
			wantStatus:   http.StatusOK,
			wantContains: "<!doctype html>",
		},
		{
			name:         "index.html returns content",
			path:         "/index.html",
			wantStatus:   http.StatusOK,
			wantContains: "<!doctype html>",
		},
		{
			name:         "unknown path returns index.html (SPA fallback)",
			path:         "/unknown/path",
			wantStatus:   http.StatusOK,
			wantContains: "<!doctype html>",
		},
		{
			name:         "vite.svg returns svg",
			path:         "/vite.svg",
			wantStatus:   http.StatusOK,
			wantContains: "<svg",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := http.Get(server.URL + tt.path)
			if err != nil {
				t.Fatalf("failed to get %s: %v", tt.path, err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tt.wantStatus {
				t.Errorf("status = %d, want %d", resp.StatusCode, tt.wantStatus)
			}

			body, err := io.ReadAll(resp.Body)
			if err != nil {
				t.Fatalf("failed to read body: %v", err)
			}

			if tt.wantContains != "" && !strings.Contains(string(body), tt.wantContains) {
				t.Errorf("body does not contain %q, got: %s", tt.wantContains, string(body)[:min(100, len(body))])
			}
		})
	}
}
