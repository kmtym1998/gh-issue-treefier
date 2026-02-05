package server

import (
	"fmt"
	"net/http"
)

type Server struct {
	port int
}

func New() *Server {
	return &Server{
		port: 8080,
	}
}

func (s *Server) Start() error {
	mux := http.NewServeMux()

	// TODO: 静的ファイル配信
	// TODO: GitHub API プロキシ

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("gh-issue-treefier"))
	})

	addr := fmt.Sprintf(":%d", s.port)
	fmt.Printf("Starting server on http://localhost%s\n", addr)

	return http.ListenAndServe(addr, mux)
}
