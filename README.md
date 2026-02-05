# gh-issue-treefier

GitHub issue の依存関係（blocking/blocked by）を DAG として可視化・編集するツール。

## 必要なもの

- Go 1.22+
- Node.js 20+
- gh CLI 2.0+

## セットアップ

```bash
# フロントエンドの依存関係インストール
cd web && npm install
```

## 開発

```bash
# フロントエンド開発サーバー (http://localhost:5173)
make dev-web

# Go サーバー起動 (http://localhost:8080)
make dev-go
```

## ビルド

```bash
make build
```

## リント・フォーマット

```bash
make lint   # チェックのみ
make fmt    # 自動修正
```

## VSCode 設定

Biome 拡張機能をインストールすれば、保存時に自動フォーマットされます。
