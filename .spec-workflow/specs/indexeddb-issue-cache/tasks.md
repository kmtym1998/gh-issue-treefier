# Tasks Document

- [x] 1. Go サーバーのデフォルトポートを 7000 に固定する
  - File: `internal/cmd/console.go`
  - `--port` フラグのデフォルト値を `0`（OS 自動割り当て）から `7000` に変更する
  - ポート `7000` が使用中の場合、`7001`, `7002`, ... と順にリッスンを試みるフォールバックロジックを実装する
  - `--port` フラグで明示的にポートが指定された場合はフォールバックせず、そのポートのみを試みる
  - _Leverage: `internal/cmd/console.go`（既存の `net.Listen` + `--port` フラグ処理）_
  - _Requirements: その他考慮事項 - サーバー起動ポートの固定_
  - _Prompt: Implement the task for spec indexeddb-issue-cache, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Go Developer | Task: `internal/cmd/console.go` のポート選択ロジックを変更する。デフォルトポートを 7000 に変更し、使用中の場合は 7001, 7002, ... と最大 10 ポート試行するフォールバックを実装する。`--port` フラグで明示指定された場合はフォールバックなしでそのポートのみ使用する。 | Restrictions: `internal/server/server.go` は変更しない。既存の `net.Listen` → `srv.Start(ln)` フローは維持する。フォールバック試行回数は最大 10 回とする。 | Success: `--port` 未指定時にデフォルト 7000 でリッスンし、7000 が使用中なら 7001 以降を試みる。`--port 8080` 指定時は 8080 のみ試みる。既存テストがパスする。 | After completing implementation, mark this task as [-] in tasks.md, log implementation with log-implementation tool, then mark as [x] when done._

- [x] 2. `idb` と `fake-indexeddb` をインストールする
  - File: `web/package.json`
  - `idb` を本番依存に、`fake-indexeddb` を dev 依存にインストールする
  - _Requirements: ステアリングドキュメントとの整合性 - tech.md との技術基準_
  - _Prompt: Implement the task for spec indexeddb-issue-cache, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: `web/` ディレクトリで `npm install idb` と `npm install --save-dev fake-indexeddb` を実行する。 | Restrictions: 他のパッケージは追加・更新しない。 | Success: `web/package.json` の dependencies に `idb`、devDependencies に `fake-indexeddb` が追加されている。 | After completing implementation, mark this task as [-] in tasks.md, log implementation with log-implementation tool, then mark as [x] when done._

- [x] 3. `idb-cache` モジュールを作成する
  - File: `web/src/lib/idb-cache.ts`
  - IndexedDB のキャッシュ CRUD 操作を提供するスタンドアロンモジュールを新規作成する
  - エクスポート関数: `getCachedItems`, `setCachedItems`, `invalidateCache`, `clearAllCache`
  - DB 名 `gh-issue-treefier`、ストア名 `projectItems`、バージョン `1`
  - DB コネクションはシングルトン（lazy 初期化）
  - 全操作を try/catch でラップし、エラー時は静かに失敗（null / no-op）
  - _Leverage: `idb` ライブラリ、`web/src/types/github.ts`（`GitHubProjectV2Item` 型）_
  - _Requirements: 即時表示、非対応環境での動作_
  - _Prompt: Implement the task for spec indexeddb-issue-cache, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer | Task: `web/src/lib/idb-cache.ts` を新規作成する。`idb` ライブラリの `openDB` を使い、DB 名 `gh-issue-treefier`、ストア `projectItems`（キー: `projectId`）で IndexedDB キャッシュモジュールを実装する。`getCachedItems(projectId)` は `{ projectId, items, cachedAt }` または null を返す。`setCachedItems(projectId, items)` はキャッシュを書き込む。`invalidateCache(projectId)` と `clearAllCache()` で削除操作を提供する。 | Restrictions: React に依存しない純粋なユーティリティとして実装する。全操作を try/catch でラップし、IndexedDB 非対応環境でも例外を投げない。DB コネクションはモジュールスコープのシングルトンとする。 | Success: 4 つの関数が正しくエクスポートされ、IndexedDB の読み書き・削除が動作する。エラー時に例外が投げられない。 | After completing implementation, mark this task as [-] in tasks.md, log implementation with log-implementation tool, then mark as [x] when done._

- [x] 4. `idb-cache` モジュールのユニットテストを作成する
  - File: `web/src/lib/idb-cache.test.ts`
  - `fake-indexeddb/auto` を使って IndexedDB をポリフィルしたテストを作成する
  - テストケース: get/set ラウンドトリップ、存在しないキーで null、`invalidateCache`、`clearAllCache`、エラー時に例外が投げられない
  - _Leverage: `fake-indexeddb`、Vitest、`web/src/lib/idb-cache.ts`_
  - _Requirements: テスト戦略 - ユニットテスト_
  - _Prompt: Implement the task for spec indexeddb-issue-cache, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: `web/src/lib/idb-cache.test.ts` を新規作成する。`fake-indexeddb/auto` を import して IndexedDB をポリフィルし、`getCachedItems` / `setCachedItems` / `invalidateCache` / `clearAllCache` の各関数をテストする。 | Restrictions: 各テストケース間で DB 状態が干渉しないようにする。`vi.useFakeTimers()` は使わない（タイムスタンプの正確性はテスト対象外）。既存のテストパターン（`web/src/hooks/use-project-issues.test.ts`）に倣う。 | Success: `npm test` で全テストケースがパスする。get/set ラウンドトリップ、存在しないキーで null、invalidateCache 後に null、clearAllCache 後に全エントリが削除されることを確認。 | After completing implementation, mark this task as [-] in tasks.md, log implementation with log-implementation tool, then mark as [x] when done._

- [ ] 5. `useProjectIssues` フックに SWR キャッシュとフィルタ分離を実装する
  - File: `web/src/hooks/use-project-issues.ts`
  - 内部状態を `issues` / `dependencies` から `rawItems`（`GitHubProjectV2Item[]`）に変更する
  - `useEffect` の依存配列から `state` / `fieldFilters` を除外し、`projectId` と `refetchKey` のみにする
  - SWR フロー: キャッシュヒット時は即時表示 + バックグラウンド API フェッチ、キャッシュミス時は loading → API フェッチ
  - `issues` と `dependencies` は `useMemo` で `rawItems` から導出する
  - 返り値に `isRevalidating: boolean` を追加する
  - `refetch()` 呼び出し時はキャッシュをバイパスして API から強制取得する
  - _Leverage: `web/src/lib/idb-cache.ts`（`getCachedItems`, `setCachedItems`）、既存の純粋関数（`parseProjectItems`, `parseProjectDependencies`, `matchesFieldFilters`）_
  - _Requirements: 即時表示、バックグラウンド更新、手動リフレッシュ_
  - _Prompt: Implement the task for spec indexeddb-issue-cache, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer | Task: `web/src/hooks/use-project-issues.ts` を SWR パターンに改修する。(1) 内部状態を `rawItems: GitHubProjectV2Item[]` に変更。(2) `useEffect` の deps を `[projectId, refetchKey]` のみにする。(3) useEffect 内で `getCachedItems` → キャッシュヒットなら `setRawItems` → 常に API フェッチ → `setRawItems` + `setCachedItems`。(4) `issues` を `useMemo([rawItems, state, fieldFilters])` で導出（`matchesFieldFilters` → `parseProjectItems` → state フィルタ）。(5) `dependencies` を `useMemo([rawItems])` で導出（`parseProjectDependencies`）。(6) `isRevalidating` state を追加し、キャッシュ表示後の API フェッチ中に true にする。(7) `refetch()` は `forceRefetchRef` を使いキャッシュバイパス。 | Restrictions: 既存の純粋関数（`parseProjectItems`, `parseProjectDependencies`, `matchesFieldFilters`, `buildIssueId`）は変更しない。`UseProjectIssuesResult` に `isRevalidating` を追加する以外、既存の返り値の型を壊さない。 | Success: フィルタ変更時に API リクエストが飛ばない。キャッシュヒット時は即時表示 + バックグラウンド更新。キャッシュミス時は loading 表示。refetch で強制再取得。既存テスト（`use-project-issues.test.ts`）がパスする。`npm run build` で型エラーなし。 | After completing implementation, mark this task as [-] in tasks.md, log implementation with log-implementation tool, then mark as [x] when done._

- [ ] 6. `useIssueMutations` にキャッシュ無効化を追加する
  - File: `web/src/hooks/use-issue-mutations.ts`, `web/src/components/issue-dashboard.tsx`
  - `useIssueMutations` の引数に `projectId?: string` を追加する
  - mutation 成功時に `invalidateCache(projectId)` を呼び出す
  - `IssueDashboard` で `useIssueMutations(filters.projectId)` に変更する
  - _Leverage: `web/src/lib/idb-cache.ts`（`invalidateCache`）_
  - _Requirements: データ変更時の整合性_
  - _Prompt: Implement the task for spec indexeddb-issue-cache, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer | Task: (1) `web/src/hooks/use-issue-mutations.ts` の `useIssueMutations` 関数に第1引数 `projectId?: string` を追加する。`wrap` 関数内の `onSuccess?.()` の直前に `if (projectId) { invalidateCache(projectId); }` を追加する。`wrap` の deps に `projectId` を追加する。(2) `web/src/components/issue-dashboard.tsx` で `useIssueMutations()` を `useIssueMutations(filters.projectId)` に変更する。 | Restrictions: 既存の mutation 関数（`addSubIssue`, `removeSubIssue`, `addBlockedBy`, `removeBlockedBy`）は変更しない。`UseIssueMutationsResult` 型は変更しない。 | Success: mutation 成功後にキャッシュが無効化される。`npm run build` で型エラーなし。既存テスト（`use-issue-mutations.test.ts`）がパスする。 | After completing implementation, mark this task as [-] in tasks.md, log implementation with log-implementation tool, then mark as [x] when done._

- [ ] 7. `IssueDashboard` にバックグラウンド更新中の表示を追加する
  - File: `web/src/components/issue-dashboard.tsx`
  - `useProjectIssues` の返り値から `isRevalidating` を取得する
  - バックグラウンド更新中であることを示す視覚的なインジケータ（例: 小さなスピナーやテキスト）を表示する
  - _Leverage: `web/src/hooks/use-project-issues.ts`（`isRevalidating`）_
  - _Requirements: バックグラウンド更新 - バックグラウンド更新中であることをユーザーに視覚的に示す_
  - _Prompt: Implement the task for spec indexeddb-issue-cache, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer | Task: `web/src/components/issue-dashboard.tsx` で `useProjectIssues` の返り値から `isRevalidating` を取得し、バックグラウンド更新中に控えめなインジケータを表示する。グラフエリア内の右上等に「更新中...」のような小さなテキストを配置する。 | Restrictions: 既存のレイアウトを大きく変更しない。loading 状態（初回読み込み）の表示は従来通り維持する。 | Success: キャッシュヒット + バックグラウンド更新中に視覚的なインジケータが表示される。更新完了後にインジケータが消える。初回読み込み時は従来の loading 表示のまま。 | After completing implementation, mark this task as [-] in tasks.md, log implementation with log-implementation tool, then mark as [x] when done._

- [ ] 8. ビルドとテストの最終確認
  - `npm run build` で型エラーがないことを確認する
  - `npm test` で全テスト（既存 + 新規）がパスすることを確認する
  - _Requirements: 全要件_
  - _Prompt: Implement the task for spec indexeddb-issue-cache, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: `web/` ディレクトリで `npm run build` と `npm test` を実行し、型エラーとテスト失敗がないことを確認する。Go サーバーは `go build ./...` でビルド確認する。 | Restrictions: コード修正はこのタスクでは行わない。問題が見つかった場合は報告のみ。 | Success: `npm run build` が型エラーなしで成功。`npm test` で全テストがパス。`go build ./...` が成功。 | After completing implementation, mark this task as [-] in tasks.md, log implementation with log-implementation tool, then mark as [x] when done._
