.PHONY: build dev dev-web dev-go clean dashboard lint fmt

# ビルド
build: build-web build-go

build-web:
	cd web && npm run build
	rm -rf dist && cp -r web/dist dist

build-go:
	go build -o gh-issue-treefier ./cmd/gh-issue-treefier

# 開発
dev-web:
	cd web && npm run dev

dev-go:
	go run ./cmd/gh-issue-treefier

# リント・フォーマット
lint:
	cd web && npx biome check .

fmt:
	cd web && npx biome format --write .
	cd web && npx biome check --write .

# クリーンアップ
clean:
	rm -rf gh-issue-treefier dist web/dist

# spec-workflow ダッシュボード
dashboard:
	npx -y @pimzino/spec-workflow-mcp@latest $(shell pwd) --dashboard --port 5001
