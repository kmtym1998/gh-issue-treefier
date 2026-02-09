package server

import (
	"fmt"
	"net"
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

func (s *Server) Start(ln net.Listener) error {
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

	return http.Serve(ln, mux)
}
