package cache

import (
	"encoding/json"
	"testing"
	"time"
)

func TestGetCache_Empty(t *testing.T) {
	s := NewStore(t.TempDir())
	c := s.GetCache("proj-1")
	if c.Items != nil {
		t.Fatalf("expected nil items, got %s", c.Items)
	}
	if len(c.NodePositions) != 0 {
		t.Fatalf("expected empty positions, got %v", c.NodePositions)
	}
}

func TestSetItems_RoundTrip(t *testing.T) {
	s := NewStore(t.TempDir())
	items := json.RawMessage(`[{"id":1},{"id":2}]`)
	s.SetItems("proj-1", items)

	c := s.GetCache("proj-1")
	if string(c.Items) != string(items) {
		t.Fatalf("expected %s, got %s", items, c.Items)
	}
}

func TestDeleteItems_KeepsNodePositions(t *testing.T) {
	s := NewStore(t.TempDir())
	s.SetItems("proj-1", json.RawMessage(`[1,2,3]`))
	s.MergeNodePositions("proj-1", map[string]NodePosition{
		"node-1": {X: 10, Y: 20},
	})

	s.DeleteItems("proj-1")
	c := s.GetCache("proj-1")
	if c.Items != nil {
		t.Fatalf("expected nil items, got %s", c.Items)
	}
	if pos, ok := c.NodePositions["node-1"]; !ok || pos.X != 10 || pos.Y != 20 {
		t.Fatalf("expected node positions to be preserved, got %v", c.NodePositions)
	}
}

func TestMergeNodePositions(t *testing.T) {
	s := NewStore(t.TempDir())
	s.MergeNodePositions("proj-1", map[string]NodePosition{
		"node-1": {X: 10, Y: 20},
		"node-2": {X: 30, Y: 40},
	})
	// update existing + add new
	s.MergeNodePositions("proj-1", map[string]NodePosition{
		"node-1": {X: 99, Y: 99},
		"node-3": {X: 50, Y: 60},
	})

	c := s.GetCache("proj-1")
	if pos := c.NodePositions["node-1"]; pos.X != 99 || pos.Y != 99 {
		t.Fatalf("expected node-1 to be updated, got %v", pos)
	}
	if pos := c.NodePositions["node-2"]; pos.X != 30 || pos.Y != 40 {
		t.Fatalf("expected node-2 to be preserved, got %v", pos)
	}
	if pos := c.NodePositions["node-3"]; pos.X != 50 || pos.Y != 60 {
		t.Fatalf("expected node-3 to be added, got %v", pos)
	}
}

func TestFlush_DiskRoundTrip(t *testing.T) {
	dir := t.TempDir()
	s := NewStore(dir)
	items := json.RawMessage(`[{"id":"test"}]`)
	s.SetItems("proj-1", items)
	s.MergeNodePositions("proj-1", map[string]NodePosition{
		"node-1": {X: 100, Y: 200},
	})
	s.FlushAll()

	// new store from same dir
	s2 := NewStore(dir)
	c := s2.GetCache("proj-1")
	if string(c.Items) != string(items) {
		t.Fatalf("expected %s, got %s", items, c.Items)
	}
	if pos := c.NodePositions["node-1"]; pos.X != 100 || pos.Y != 200 {
		t.Fatalf("expected (100,200), got %v", pos)
	}
}

func TestStop_FinalFlush(t *testing.T) {
	dir := t.TempDir()
	s := NewStore(dir)
	s.Start(1 * time.Hour) // long interval, won't tick
	s.SetItems("proj-1", json.RawMessage(`[1]`))
	s.Stop()

	s2 := NewStore(dir)
	c := s2.GetCache("proj-1")
	if string(c.Items) != "[1]" {
		t.Fatalf("expected [1], got %s", c.Items)
	}
}
