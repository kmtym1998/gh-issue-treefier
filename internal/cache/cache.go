package cache

import (
	"encoding/json"
	"fmt"
	"maps"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// NodePosition はグラフ上のノード座標を表す。
type NodePosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// ProjectCache は1プロジェクト分のキャッシュデータを表す。
type ProjectCache struct {
	Items         json.RawMessage         `json:"items"`
	NodePositions map[string]NodePosition `json:"nodePositions"`
}

// Store はインメモリキャッシュと定期ファイルフラッシュを管理する。
type Store struct {
	mu       sync.RWMutex
	caches   map[string]*ProjectCache
	cacheDir string
	dirty    map[string]bool
	stopCh   chan struct{}
	doneCh   chan struct{}
}

// NewStore は指定ディレクトリをバックエンドとする Store を作成する。
func NewStore(cacheDir string) *Store {
	return &Store{
		caches:   make(map[string]*ProjectCache),
		cacheDir: cacheDir,
		dirty:    make(map[string]bool),
	}
}

// Start は定期フラッシュ goroutine を開始する。
func (s *Store) Start(interval time.Duration) {
	s.stopCh = make(chan struct{})
	s.doneCh = make(chan struct{})
	go func() {
		defer close(s.doneCh)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				s.FlushAll()
			case <-s.stopCh:
				s.FlushAll()
				return
			}
		}
	}()
}

// Stop は goroutine を停止し、最終フラッシュを行う。
func (s *Store) Stop() {
	close(s.stopCh)
	<-s.doneCh
}

// GetCache は指定プロジェクトのキャッシュを返す。
// インメモリになければディスクから遅延ロードする。
func (s *Store) GetCache(projectID string) *ProjectCache {
	s.mu.RLock()
	if c, ok := s.caches[projectID]; ok {
		s.mu.RUnlock()
		return c
	}
	s.mu.RUnlock()

	s.mu.Lock()
	defer s.mu.Unlock()

	// double-check after acquiring write lock
	if c, ok := s.caches[projectID]; ok {
		return c
	}

	loaded, err := s.loadFromDisk(projectID)
	if err != nil || loaded == nil {
		c := &ProjectCache{
			NodePositions: make(map[string]NodePosition),
		}
		s.caches[projectID] = c
		return c
	}
	s.caches[projectID] = loaded
	return loaded
}

// SetItems は items を更新し dirty マークを付ける。
func (s *Store) SetItems(projectID string, items json.RawMessage) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.getOrCreate(projectID)
	c.Items = items
	s.dirty[projectID] = true
}

// DeleteItems は items を nil にし dirty マークを付ける。
func (s *Store) DeleteItems(projectID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.getOrCreate(projectID)
	c.Items = nil
	s.dirty[projectID] = true
}

// MergeNodePositions は既存マップにマージし dirty マークを付ける。
func (s *Store) MergeNodePositions(projectID string, positions map[string]NodePosition) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.getOrCreate(projectID)
	maps.Copy(c.NodePositions, positions)
	s.dirty[projectID] = true
}

// getOrCreate はインメモリキャッシュからエントリを返すか、なければ作成する。
// mu.Lock を保持した状態で呼ぶこと。
func (s *Store) getOrCreate(projectID string) *ProjectCache {
	if c, ok := s.caches[projectID]; ok {
		return c
	}

	loaded, err := s.loadFromDisk(projectID)
	if err != nil || loaded == nil {
		loaded = &ProjectCache{
			NodePositions: make(map[string]NodePosition),
		}
	}
	s.caches[projectID] = loaded
	return loaded
}

// FlushAll は dirty なエントリをファイルに書き出す。
func (s *Store) FlushAll() {
	s.mu.Lock()
	toFlush := make(map[string]*ProjectCache)
	for id := range s.dirty {
		toFlush[id] = s.caches[id]
	}
	s.dirty = make(map[string]bool)
	s.mu.Unlock()

	for id, c := range toFlush {
		if err := s.writeToDisk(id, c); err != nil {
			// dirty マークを復元して次回リトライ
			s.mu.Lock()
			s.dirty[id] = true
			s.mu.Unlock()
		}
	}
}

func (s *Store) cacheFilePath(projectID string) string {
	return filepath.Join(s.cacheDir, projectID+".json")
}

func (s *Store) loadFromDisk(projectID string) (*ProjectCache, error) {
	data, err := os.ReadFile(s.cacheFilePath(projectID))
	if err != nil {
		return nil, err
	}
	var c ProjectCache
	if err := json.Unmarshal(data, &c); err != nil {
		return nil, fmt.Errorf("failed to unmarshal cache: %w", err)
	}
	if c.NodePositions == nil {
		c.NodePositions = make(map[string]NodePosition)
	}
	return &c, nil
}

func (s *Store) writeToDisk(projectID string, c *ProjectCache) error {
	if err := os.MkdirAll(s.cacheDir, 0o755); err != nil {
		return fmt.Errorf("failed to create cache dir: %w", err)
	}
	data, err := json.Marshal(c)
	if err != nil {
		return fmt.Errorf("failed to marshal cache: %w", err)
	}
	return os.WriteFile(s.cacheFilePath(projectID), data, 0o644)
}
