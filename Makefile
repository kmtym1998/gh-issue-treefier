.PHONY: build dev dev-web dev-go clean dashboard lint fmt test test-go test-web test-storybook

# ビルド
build: build-web embed-dist build-go

build-web:
	cd web && npm ci && npm run build

embed-dist:
	rm -rf internal/server/dist
	cp -r web/dist internal/server/dist

build-go:
	go build -o gh-issue-treefier ./cmd/gh-issue-treefier

# 開発（フロント + Go を並列起動）
dev:
	$(MAKE) dev-web & $(MAKE) dev-go & wait

dev-web:
	cd web && npm run dev

dev-go:
	go run ./cmd/gh-issue-treefier console
	gh extensions remove gh-issue-treefier || true
	gh extension install .

# リント・フォーマット
lint:
	cd web && npx biome check .

fmt:
	cd web && npx biome format --write .
	cd web && npx biome check --write .

# テスト
test: test-go test-web test-storybook

test-go:
	go test ./...

test-web:
	cd web && npm test

test-storybook:
	cd web && npm run test:storybook

# クリーンアップ
clean:
	rm -rf gh-issue-treefier dist web/dist internal/server/dist

# spec-workflow ダッシュボード
dashboard:
	npx -y @pimzino/spec-workflow-mcp@latest $(shell pwd) --dashboard --port 5001
