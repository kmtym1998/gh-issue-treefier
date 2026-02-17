package server

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/kmtym1998/gh-issue-treefier/internal/cache"
)

type cacheHandler struct {
	store *cache.Store
}

func (h *cacheHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Strip "/api/cache/" prefix to get "<projectId>" or "<projectId>/sub"
	path := strings.TrimPrefix(r.URL.Path, "/api/cache/")
	if path == "" {
		http.Error(w, "missing project ID", http.StatusBadRequest)
		return
	}

	// POST /api/cache/flush — 全キャッシュをディスクに書き出す
	if path == "flush" && r.Method == http.MethodPost {
		h.store.FlushAll()
		w.WriteHeader(http.StatusNoContent)
		return
	}

	projectID, sub, _ := strings.Cut(path, "/")
	if projectID == "" {
		http.Error(w, "missing project ID", http.StatusBadRequest)
		return
	}

	switch {
	case sub == "" && r.Method == http.MethodGet:
		h.handleGet(w, projectID)
	case sub == "items" && r.Method == http.MethodPut:
		h.handlePutItems(w, r, projectID)
	case sub == "items" && r.Method == http.MethodDelete:
		h.handleDeleteItems(w, projectID)
	case sub == "node-positions" && r.Method == http.MethodPut:
		h.handlePutNodePositions(w, r, projectID)
	default:
		http.Error(w, "not found", http.StatusNotFound)
	}
}

func (h *cacheHandler) handleGet(w http.ResponseWriter, projectID string) {
	c := h.store.GetCache(projectID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

func (h *cacheHandler) handlePutItems(w http.ResponseWriter, r *http.Request, projectID string) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}
	h.store.SetItems(projectID, json.RawMessage(body))
	w.WriteHeader(http.StatusNoContent)
}

func (h *cacheHandler) handleDeleteItems(w http.ResponseWriter, projectID string) {
	h.store.DeleteItems(projectID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *cacheHandler) handlePutNodePositions(w http.ResponseWriter, r *http.Request, projectID string) {
	var positions map[string]cache.NodePosition
	if err := json.NewDecoder(r.Body).Decode(&positions); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	h.store.MergeNodePositions(projectID, positions)
	w.WriteHeader(http.StatusNoContent)
}
