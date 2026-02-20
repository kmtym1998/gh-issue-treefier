package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/kmtym1998/gh-issue-treefier/internal/cache"
)

func setupHandler(t *testing.T) (*cacheHandler, *cache.Store) {
	t.Helper()
	store := cache.NewStore(t.TempDir())
	return &cacheHandler{store: store}, store
}

func TestGetCache_Empty(t *testing.T) {
	h, _ := setupHandler(t)
	req := httptest.NewRequest(http.MethodGet, "/api/cache/proj-1", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var raw map[string]json.RawMessage
	json.NewDecoder(w.Body).Decode(&raw)
	if string(raw["items"]) != "null" {
		t.Fatalf("expected null items, got %s", raw["items"])
	}
	var positions map[string]cache.NodePosition
	json.Unmarshal(raw["nodePositions"], &positions)
	if len(positions) != 0 {
		t.Fatalf("expected empty positions, got %v", positions)
	}
}

func TestPutItems(t *testing.T) {
	h, store := setupHandler(t)
	body := `[{"id":1},{"id":2}]`
	req := httptest.NewRequest(http.MethodPut, "/api/cache/proj-1/items", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}
	c := store.GetCache("proj-1")
	if string(c.Items) != body {
		t.Fatalf("expected %s, got %s", body, c.Items)
	}
}

func TestDeleteItems(t *testing.T) {
	h, store := setupHandler(t)
	store.SetItems("proj-1", json.RawMessage(`[1,2]`))

	req := httptest.NewRequest(http.MethodDelete, "/api/cache/proj-1/items", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}
	c := store.GetCache("proj-1")
	if c.Items != nil {
		t.Fatalf("expected nil items, got %s", c.Items)
	}
}

func TestPutNodePositions(t *testing.T) {
	h, store := setupHandler(t)
	// set initial positions
	store.MergeNodePositions("proj-1", map[string]cache.NodePosition{
		"node-1": {X: 10, Y: 20},
	})

	body := `{"node-1":{"x":99,"y":99},"node-2":{"x":50,"y":60}}`
	req := httptest.NewRequest(http.MethodPut, "/api/cache/proj-1/node-positions", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}
	c := store.GetCache("proj-1")
	if pos := c.NodePositions["node-1"]; pos.X != 99 || pos.Y != 99 {
		t.Fatalf("expected (99,99), got %v", pos)
	}
	if pos := c.NodePositions["node-2"]; pos.X != 50 || pos.Y != 60 {
		t.Fatalf("expected (50,60), got %v", pos)
	}
}

func TestGetAfterPut(t *testing.T) {
	h, _ := setupHandler(t)

	// PUT items
	putReq := httptest.NewRequest(http.MethodPut, "/api/cache/proj-1/items", strings.NewReader(`[{"x":1}]`))
	putW := httptest.NewRecorder()
	h.ServeHTTP(putW, putReq)

	// PUT node-positions
	posReq := httptest.NewRequest(http.MethodPut, "/api/cache/proj-1/node-positions", strings.NewReader(`{"n1":{"x":5,"y":6}}`))
	posW := httptest.NewRecorder()
	h.ServeHTTP(posW, posReq)

	// GET
	getReq := httptest.NewRequest(http.MethodGet, "/api/cache/proj-1", nil)
	getW := httptest.NewRecorder()
	h.ServeHTTP(getW, getReq)

	var c cache.ProjectCache
	json.NewDecoder(getW.Body).Decode(&c)
	if string(c.Items) != `[{"x":1}]` {
		t.Fatalf("expected items, got %s", c.Items)
	}
	if pos := c.NodePositions["n1"]; pos.X != 5 || pos.Y != 6 {
		t.Fatalf("expected (5,6), got %v", pos)
	}
}

func TestNotFound(t *testing.T) {
	h, _ := setupHandler(t)
	req := httptest.NewRequest(http.MethodGet, "/api/cache/proj-1/unknown", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestMissingProjectID(t *testing.T) {
	h, _ := setupHandler(t)
	req := httptest.NewRequest(http.MethodGet, "/api/cache/", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}
