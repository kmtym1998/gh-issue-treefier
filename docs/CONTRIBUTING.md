# 開発者向けドキュメント

## 必要なツール

- Go 1.25+
- Node.js 24+（Volta で管理）
- gh CLI 2.0+

## 開発環境の立ち上げ

```bash
# フロントエンド + Go サーバーを並列起動
make dev

# フロントエンド開発サーバーのみ (http://localhost:5173)
make dev-web

# Go サーバーのみ (http://localhost:8080)
make dev-go
```

## ビルド

```bash
# フルビルド（フロントエンド → 埋め込み → Go バイナリ → gh extension インストール）
make build
```

## テスト

```bash
make test            # 全テスト実行（Go + フロントエンド + Storybook）
make test-go         # Go テスト
make test-web        # フロントエンドユニットテスト（Vitest）
make test-storybook  # Storybook インタラクションテスト
```

## リント・フォーマット

```bash
make lint   # チェックのみ（Biome）
make fmt    # 自動修正
```

## アーキテクチャ

```
Browser (React + React Flow)
  ↕ /api/github/{rest,graphql}
Go HTTP Server (認証プロキシ + SPA 配信)
  ↕ gh CLI の認証情報を利用
GitHub API (REST + GraphQL)
```

Go サーバーが React フロントエンドをバイナリに埋め込み（`embed`）、シングルバイナリとして配布します。GitHub API へのリクエストは Go サーバーが `gh` CLI の認証情報を利用してプロキシします。

## VSCode 設定

Biome 拡張機能をインストールすれば、保存時に自動フォーマットされます。
