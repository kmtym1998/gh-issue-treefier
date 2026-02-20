package server

import (
	"fmt"
	"net"
	"net/http"

	"github.com/kmtym1998/gh-issue-treefier/internal/cache"
)

type Server struct {
	port       int
	cacheStore *cache.Store
}

func New(port int, cacheStore *cache.Store) *Server {
	return &Server{
		port:       port,
		cacheStore: cacheStore,
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

	// Cache API
	mux.Handle("/api/cache/", &cacheHandler{store: s.cacheStore})

	// Static file serving with SPA fallback
	mux.Handle("/", newSPAHandler())

	return http.Serve(ln, mux)
}
