package server

import (
	"fmt"
	"net/http"
)

type Server struct {
	port int
}

func New(port int) *Server {
	return &Server{
		port: port,
	}
}

func (s *Server) Start() error {
	mux := http.NewServeMux()

	// GitHub API proxy
	proxy, err := newProxyHandler()
	if err != nil {
		return fmt.Errorf("failed to create proxy handler: %w", err)
	}
	mux.HandleFunc("/api/github/rest/", proxy.ServeRESTProxy)
	mux.HandleFunc("/api/github/graphql", proxy.ServeGraphQLProxy)

	// Static file serving with SPA fallback
	mux.Handle("/", newSPAHandler())

	addr := fmt.Sprintf(":%d", s.port)

	return http.ListenAndServe(addr, mux)
}
