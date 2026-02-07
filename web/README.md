# web

gh-issue-treefier のフロントエンドアプリケーション。React + TypeScript + Vite で構築されている。

## 技術スタック

- React / TypeScript
- Vite (ビルド・開発サーバー)
- Vitest (ユニットテスト)
- Storybook + Playwright (インタラクションテスト)
- Biome (リンター・フォーマッター)
- MSW (API モック)

## セットアップ

```bash
# Node.js のバージョンは Volta で管理 (v24.13.0)
cd web
npm install
```

## 開発

```bash
# 開発サーバー起動
npm run dev

# Storybook 起動
npm run storybook
```

## テスト

```bash
# ユニットテスト実行
npm test

# ユニットテスト (watch モード)
npm run test:watch

# Storybook インタラクションテスト実行
npm run test:storybook
```

## その他のコマンド

```bash
# リント
npm run lint

# フォーマット
npm run format

# プロダクションビルド
npm run build
```

## ディレクトリ構成

```
src/
├── api-client/   # API クライアント
├── hooks/        # カスタムフック
├── types/        # 型定義
├── App.tsx       # ルートコンポーネント
└── main.tsx      # エントリーポイント
```
