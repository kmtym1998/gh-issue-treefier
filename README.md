# gh-issue-treefier

GitHub issue の依存関係（blocking/blocked by および sub-issue）を **DAG（有向非巡回グラフ）** として可視化・編集する GitHub CLI 拡張機能。

## 機能

- Sub-issue / blocked-by の依存関係を DAG としてインタラクティブに可視化
- ドラッグ & クリックで依存関係をその場で編集
- owner・ステータス・プロジェクトフィールドによるフィルタリング
- クロスリポジトリの依存関係にも対応

## インストール

```bash
gh extension install kmtym1998/gh-issue-treefier
```

## 使い方

```bash
# コンソールを起動（ブラウザが自動で開く）
gh issue-treefier console

# リポジトリを指定して起動
gh issue-treefier console --repo owner/repo

# ポートを指定して起動
gh issue-treefier console --port 3000
```

起動するとプロジェクトの選択プロンプトが表示され、選択後にブラウザで Web UI が開きます。

## 開発者向けドキュメント

開発環境のセットアップやビルド・テストの手順については [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) を参照してください。
