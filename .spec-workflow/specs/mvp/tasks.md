# Tasks Document

このドキュメントは `2026-02-06` に作成されました。

## バックエンド

- [x] 1. console サブコマンドの実装
  - File: cmd/gh-issue-treefier/main.go
  - `console` サブコマンドを追加
  - `--port` オプションでポート指定（未指定時は空きポート自動採番）
  - 起動時にポート番号をコンソール表示
  - Purpose: CLI エントリーポイントの完成
  - _Requirements: サーバー起動_
  - _Prompt: Role: Go Developer | Task: console サブコマンドを実装。--port フラグで指定可能、未指定時は net.Listen で空きポートを取得。起動後にブラウザを自動で開く（pkg/browser または os/exec）| Restrictions: 標準ライブラリと go-gh のみ使用 | Success: gh issue-treefier console で起動、--port 3000 で指定ポート使用、自動でブラウザが開く_

- [x] 2. HTTP サーバーの静的ファイル配信
  - File: internal/server/server.go, internal/server/static.go
  - embed で React ビルド成果物を埋め込み
  - `/` へのリクエストで index.html を返す
  - 静的ファイル（JS, CSS）を配信
  - Purpose: フロントエンドの配信基盤
  - _Leverage: web/dist（ビルド成果物）_
  - _Requirements: サーバー起動_
  - _Prompt: Role: Go Developer | Task: go:embed で web/dist を埋め込み、http.FileServer で配信。SPA のため存在しないパスは index.html にフォールバック | Restrictions: 開発時は embed を使わず実ファイルを読む選択肢も検討 | Success: localhost:port/ でReactアプリが表示される_

- [x] 2.1. 静的ファイル配信のテスト
  - File: internal/server/static_test.go
  - SPA フォールバックの動作確認
  - 存在するファイルと存在しないパスのテスト
  - Purpose: 静的ファイル配信の信頼性確保
  - _Leverage: net/http/httptest_
  - _Prompt: Role: Go Developer | Task: httptest.NewServer でテストサーバーを起動し、/, /index.html, /assets/xxx.js, /unknown-path へのリクエストをテスト | Success: 各パスで期待するレスポンスが返る_

- [x] 3. GitHub REST API プロキシ
  - File: internal/server/proxy.go
  - `/api/github/rest/*` を GitHub REST API に転送
  - go-gh で認証情報を取得しリクエストに付与
  - エラーハンドリング（401, 404, 429）
  - Purpose: フロントエンドから GitHub REST API へのアクセス
  - _Leverage: go-gh api.DefaultRESTClient_
  - _Requirements: GitHub API プロキシ_
  - _Prompt: Role: Go Developer | Task: /api/github/rest/ 以降のパスを api.github.com に転送。go-gh の RESTClient を使用して認証ヘッダーを自動付与 | Restrictions: リクエストボディとレスポンスはそのまま転送 | Success: /api/github/rest/repos/owner/repo/issues で issue 一覧が取得できる_

- [x] 3.1. REST API プロキシのテスト
  - File: internal/server/proxy_test.go
  - パス変換ロジックのテスト
  - エラーレスポンスのテスト（401, 404, 429）
  - Purpose: プロキシロジックの信頼性確保
  - _Leverage: net/http/httptest_
  - _Prompt: Role: Go Developer | Task: モック GitHub API サーバーを httptest で作成し、プロキシ経由でリクエストが正しく転送されるかテスト。パス変換、ヘッダー付与、エラーハンドリングを検証 | Success: プロキシが正しくリクエストを転送し、エラー時も適切なレスポンスを返す_

- [x] 4. GitHub GraphQL API プロキシ
  - File: internal/server/proxy.go
  - `/api/github/graphql` を GitHub GraphQL API に転送
  - go-gh で認証情報を取得しリクエストに付与
  - Purpose: プロジェクト・フィールド情報の取得
  - _Leverage: go-gh api.DefaultGraphQLClient_
  - _Requirements: GitHub API プロキシ_
  - _Prompt: Role: Go Developer | Task: /api/github/graphql へのPOSTリクエストを api.github.com/graphql に転送。go-gh の GraphQLClient または RESTClient を使用 | Restrictions: クエリはフロントエンドから受け取る | Success: GraphQL クエリでプロジェクト情報が取得できる_

- [x] 4.1. GraphQL API プロキシのテスト
  - File: internal/server/proxy_test.go
  - GraphQL リクエストの転送テスト
  - リクエストボディが正しく転送されるかのテスト
  - Purpose: GraphQL プロキシの信頼性確保
  - _Leverage: net/http/httptest_
  - _Prompt: Role: Go Developer | Task: モック GraphQL サーバーを作成し、POST リクエストのボディが正しく転送されるかテスト | Success: GraphQL クエリが正しく転送される_

## フロントエンド

- [x] 5. Storybook セットアップ
  - File: web/.storybook/main.ts, web/.storybook/preview.ts
  - Storybook + Vite の設定
  - インタラクションテスト用アドオンの追加
  - MSW による API モック設定
  - Purpose: コンポーネントテスト環境の構築
  - _Leverage: @storybook/react-vite, @storybook/test, msw-storybook-addon_
  - _Prompt: Role: React Developer | Task: Storybook を Vite プロジェクトに追加。@storybook/addon-interactions でインタラクションテスト、msw-storybook-addon で API モックを有効化 | Success: npm run storybook で起動、play 関数が動作する_

- [x] 6. API クライアント層の実装
  - File: web/src/api-client/index.ts
  - REST API と GraphQL API へのリクエスト関数
  - エラーハンドリングの共通化
  - Purpose: バックエンドとの通信を抽象化
  - _Requirements: Issue 一覧取得, 依存関係取得_
  - _Prompt: Role: TypeScript Developer | Task: fetch ベースの API クライアント。restGet, restPost, graphql 関数を実装。エラー時は統一的な Error オブジェクトを throw | Restrictions: 外部ライブラリ不要、fetch のみ | Success: apiClient.restGet('/repos/...') で GitHub API を呼べる_

- [x] 6.1. API クライアントのテスト
  - File: web/src/api-client/index.test.ts
  - 成功時のレスポンス処理テスト
  - エラー時の例外処理テスト（401, 404, 500）
  - Purpose: API クライアントの信頼性確保
  - _Leverage: vitest, msw または fetch モック_
  - _Prompt: Role: TypeScript Developer | Task: fetch をモックして restGet, graphql 関数をテスト。成功ケース、HTTP エラー、ネットワークエラーを検証。純粋な関数なので vitest で単体テスト | Success: 各ケースで期待する動作をする_

- [x] 7. Issue データ取得の実装
  - File: web/src/hooks/use-issues.ts
  - Issue 一覧と依存関係を取得するカスタムフック
  - フィルタ条件（リポジトリ、状態）を受け取る
  - ローディング・エラー状態の管理
  - Purpose: Issue データの取得とキャッシュ
  - _Leverage: web/src/api-client_
  - _Requirements: Issue 一覧取得, 依存関係取得_
  - _Prompt: Role: React Developer | Task: useIssues(owner, repo, filters) フックを実装。REST API で issue 一覧を取得し、各 issue の依存関係も取得。useState + useEffect でシンプルに | Restrictions: 外部状態管理ライブラリ不要 | Success: const { issues, dependencies, loading, error } = useIssues(...) で使える_

- [x] 7.1. Issue データ取得のテスト
  - File: web/src/hooks/use-issues.test.ts
  - API レスポンスから内部データ構造への変換テスト
  - Purpose: データ変換ロジックの信頼性確保
  - _Leverage: vitest_
  - _Prompt: Role: TypeScript Developer | Task: API レスポンスを内部データ構造に変換するロジックを純粋関数として切り出し、vitest でテスト。フック自体は Storybook で統合テスト | Success: 変換ロジックが正しく動作する_

- [x] 8. プロジェクト・フィールド情報取得の実装
  - File: web/src/hooks/use-projects.ts
  - GraphQL でプロジェクト一覧を取得
  - プロジェクトのフィールド（イテレーション、ステータス等）を取得
  - Purpose: フィルタ UI に必要なデータの取得
  - _Leverage: web/src/api-client_
  - _Requirements: Issue 一覧取得_
  - _Prompt: Role: React Developer | Task: useProjects(owner) でユーザー/組織のプロジェクト一覧を取得。useProjectFields(projectId) でフィールド定義を取得。GraphQL API を使用 | Restrictions: シンプルな実装から始める | Success: プロジェクト選択時にフィールド一覧が表示できる_

- [x] 8.1. プロジェクト・フィールド取得のテスト
  - File: web/src/hooks/use-projects.test.ts
  - GraphQL レスポンスのパーステスト
  - フィールド型（イテレーション、ステータス等）の処理テスト
  - Purpose: GraphQL データ処理の信頼性確保
  - _Leverage: vitest_
  - _Prompt: Role: TypeScript Developer | Task: GraphQL レスポンスをパースするロジックを純粋関数として切り出し、vitest でテスト。フック自体は Storybook で統合テスト | Success: 各フィールド型が正しく処理される_

- [x] 9. React Flow グラフ表示の実装
  - File: web/src/components/issue-graph.tsx
  - Issue をノード、依存関係をエッジとして表示
  - Dagre による自動レイアウト
  - パン・ズーム操作
  - Purpose: DAG の可視化
  - _Leverage: @xyflow/react, dagre_
  - _Requirements: グラフ表示_
  - _Prompt: Role: React Developer | Task: ReactFlow コンポーネントで DAG 表示。issues 配列から nodes を、dependencies から edges を生成。dagre でレイアウト計算後に ReactFlow に渡す | Restrictions: カスタムノードは必要になるまで使わない | Success: Issue が矢印で繋がった状態で表示される_

- [x] 9.1. グラフデータ変換のテスト
  - File: web/src/components/issue-graph.test.ts, web/src/components/issue-graph.stories.tsx
  - Issues → Nodes 変換ロジックのテスト（vitest）
  - コンポーネントの表示・操作テスト（Storybook）
  - Purpose: グラフデータ変換と UI の信頼性確保
  - _Leverage: vitest, Storybook interaction tests_
  - _Prompt: Role: React Developer | Task: (1) 純粋関数として切り出した nodes/edges 変換ロジックを vitest でテスト (2) Storybook で IssueGraph の Story を作成し、play 関数でパン・ズーム操作をテスト | Success: 変換ロジックが正しく動作し、UI 操作が期待通り動く_

- [x] 10. フィルタ UI の実装
  - File: web/src/components/filter-panel.tsx
  - リポジトリ入力フォーム
  - プロジェクト選択ドロップダウン
  - フィールド値によるフィルタ
  - 状態フィルタ（open / closed / all）
  - Purpose: ユーザーによる絞り込み
  - _Leverage: web/src/hooks/use-projects.ts_
  - _Requirements: Issue 一覧取得_
  - _Prompt: Role: React Developer | Task: フィルタ条件を選択する UI。onChange で親コンポーネントに通知。プロジェクト選択時にフィールド一覧を動的に取得 | Restrictions: CSS フレームワーク不要、最低限のスタイルで | Success: フィルタを変更すると表示される issue が変わる_

- [x] 10.1. フィルタ UI のテスト
  - File: web/src/components/filter-panel.stories.tsx
  - フォーム入力・選択操作のインタラクションテスト
  - onChange コールバックの呼び出し検証
  - Purpose: フィルタ UI の操作性確保
  - _Leverage: Storybook interaction tests_
  - _Prompt: Role: React Developer | Task: FilterPanel の Story を作成。play 関数でリポジトリ入力、プロジェクト選択、状態変更を操作し、onChange が正しく呼ばれることを検証 | Success: 各操作で期待する onChange が発火する_

- [x] 11. ノード詳細表示の実装
  - File: web/src/components/issue-detail.tsx
  - ノードクリックで issue 詳細を表示
  - タイトル、番号、状態、ラベル
  - GitHub への直接リンク
  - Purpose: 選択した issue の情報確認
  - _Requirements: ノード情報表示_
  - _Prompt: Role: React Developer | Task: 選択された issue の詳細を表示するパネル。ReactFlow の onNodeClick で選択状態を管理。GitHub URL へのリンクを含める | Restrictions: モーダルではなくサイドパネルで | Success: ノードクリックで詳細が表示され、リンクから GitHub に飛べる_

- [x] 11.1. ノード詳細表示のテスト
  - File: web/src/components/issue-detail.stories.tsx
  - 各状態（open/closed）での表示テスト
  - GitHub リンクの存在確認
  - Purpose: 詳細表示の正確性確保
  - _Leverage: Storybook interaction tests_
  - _Prompt: Role: React Developer | Task: IssueDetail の Story を作成。open/closed 状態、ラベルあり/なし等のバリエーションを用意。play 関数でリンクの存在を検証 | Success: 各状態で正しく表示される_

## 依存関係の編集

- [x] 14. API クライアントへの restDelete 追加
  - File: web/src/api-client/index.ts
  - `restDelete(path)` 関数を追加
  - Purpose: Sub-Issues API の DELETE 呼び出しに必要
  - _Leverage: 既存の request 関数_
  - _Prompt: Role: TypeScript Developer | Task: restGet/restPost と同様のパターンで restDelete を追加 | Success: restDelete('/repos/...') で DELETE リクエストが送れる_

- [x] 14.1. restDelete のテスト
  - File: web/src/api-client/index.test.ts
  - 成功時・エラー時のテスト
  - Purpose: restDelete の信頼性確保
  - _Leverage: vitest, 既存テストパターン_

- [x] 15. 依存関係の追加・削除フック
  - File: web/src/hooks/use-issue-mutations.ts
  - `addSubIssue(owner, repo, parentNumber, childNumber)` — POST /repos/:owner/:repo/issues/:number/sub_issues
  - `removeSubIssue(owner, repo, parentNumber, childNumber)` — DELETE /repos/:owner/:repo/issues/:number/sub_issues/:sub_issue_id
  - 成功後に依存関係データを再取得するコールバック
  - Purpose: 依存関係の変更を GitHub API に反映
  - _Leverage: web/src/api-client_

- [x] 15.1. 依存関係フックのテスト
  - File: web/src/hooks/use-issue-mutations.test.ts
  - API 呼び出しの引数検証
  - エラーハンドリングのテスト
  - Purpose: 変更操作の信頼性確保
  - _Leverage: vitest_

- [x] 16. 依存関係の編集 UI
  - File: web/src/components/issue-graph.tsx, web/src/components/issue-detail.tsx
  - グラフ上でエッジをクリックして削除（確認ダイアログ付き）
  - 詳細パネルに「Sub-Issue を追加」フォーム（Issue 番号入力）
  - 操作後にグラフを自動更新
  - Purpose: ブラウザ上での依存関係の編集
  - _Leverage: ReactFlow の onEdgeClick, タスク 15 のフック_

- [x] 16.1. 依存関係編集 UI のテスト
  - File: web/src/components/issue-graph.stories.tsx, web/src/components/issue-detail.stories.tsx
  - エッジ削除のインタラクションテスト
  - Sub-Issue 追加フォームのインタラクションテスト
  - Purpose: 編集 UI の操作性確保
  - _Leverage: Storybook interaction tests, MSW_

## 統合

- [x] 12. アプリケーション統合
  - File: web/src/App.tsx
  - 各コンポーネントを組み合わせ
  - 状態の受け渡し（フィルタ → データ取得 → グラフ表示）
  - Purpose: 全機能の統合
  - _Leverage: タスク 5-11 の成果物_
  - _Requirements: 全て_
  - _Prompt: Role: React Developer | Task: App.tsx で全コンポーネントを統合。フィルタ変更 → useIssues 再取得 → グラフ更新 の流れを実装 | Restrictions: 状態管理はシンプルに useState で | Success: フィルタ変更からグラフ表示まで一連の流れが動作_

- [x] 13. ビルド設定とバイナリ統合
  - File: Makefile, web/vite.config.ts
  - フロントエンドビルド → Go embed → バイナリ生成の流れ
  - 開発時のホットリロード設定
  - Purpose: リリース可能なバイナリの生成
  - _Requirements: 全て_
  - _Prompt: Role: DevOps | Task: make build で web ビルド → go build の一連の流れ。make dev で vite dev server + go run の並列起動 | Restrictions: CI でも動くようにする | Success: make build で単一バイナリが生成される_

- [x] 13.1. テスト実行の自動化
  - File: Makefile, .github/workflows/test.yml
  - `make test` で Go テスト、vitest、Storybook テストを一括実行
  - CI での自動テスト設定
  - Purpose: テストの継続的実行
  - _Prompt: Role: DevOps | Task: make test で go test ./...、vitest、storybook test を実行。GitHub Actions で PR 時にテスト実行 | Success: make test で全テストが実行される_
