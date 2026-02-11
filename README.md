# gh-issue-treefier

GitHub issue の依存関係（blocking/blocked by および sub-issue）を **DAG（有向非巡回グラフ）** として可視化・編集する GitHub CLI 拡張機能。

## 機能

- **依存関係の DAG 表示**: GitHub ProjectV2 内の issue 間の依存関係をインタラクティブなグラフとして表示
  - **Sub-issue 関係**（親子関係、実線グレーのエッジ）
  - **Blocked-by 関係**（ブロック関係、破線赤のエッジ）
- **インタラクティブな編集**: ノード間のドラッグで依存関係を追加、クリックで削除
- **フィルタリング**: owner、ステータス（open/closed/all）、プロジェクトのフィールド値で issue を絞り込み
- **Issue 詳細パネル**: ノードクリックでサイドパネルに issue の詳細（担当者、ラベル、本文など）を表示
- **クロスリポジトリ対応**: 異なるリポジトリ間の依存関係も表示可能
- **自動レイアウト**: Dagre アルゴリズムによるグラフの自動配置

## 必要なもの

- Go 1.25+
- Node.js 24+（Volta で管理）
- gh CLI 2.0+

## 使い方

```bash
# ビルド & インストール
make build

# コンソールを起動（ブラウザが自動で開く）
gh issue-treefier console

# リポジトリを指定して起動
gh issue-treefier console --repo owner/repo
```

起動するとプロジェクトの選択プロンプトが表示され、選択後にブラウザで Web UI が開きます。

## 開発

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
