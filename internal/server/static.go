package server

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed all:dist
var distFS embed.FS

type spaHandler struct {
	fileServer http.Handler
	fsys       fs.FS
}

func newSPAHandler() http.Handler {
	subFS, err := fs.Sub(distFS, "dist")
	if err != nil {
		panic(err)
	}
	return &spaHandler{
		fileServer: http.FileServer(http.FS(subFS)),
		fsys:       subFS,
	}
}

func (h *spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/")
	if path == "" {
		path = "index.html"
	}

	// Check if file exists
	_, err := fs.Stat(h.fsys, path)
	if err != nil {
		// File not found, serve index.html for SPA routing
		indexFile, err := fs.ReadFile(h.fsys, "index.html")
		if err != nil {
			http.Error(w, "index.html not found", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(indexFile)
		return
	}

	h.fileServer.ServeHTTP(w, r)
}
