# Tasks Document

- [x] 1. MUI の導入
  - File: `web/package.json`
  - `@mui/material`, `@emotion/react`, `@emotion/styled` をインストールする
  - Purpose: UI コンポーネントライブラリの導入
  - _Requirements: 全体_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Install MUI dependencies (`@mui/material`, `@emotion/react`, `@emotion/styled`) in web/package.json. Verify the installation compiles correctly and does not break existing components. | Restrictions: Do not modify any existing components in this task. | _Leverage: web/package.json_ | Success: Dependencies are installed, `npm run build` passes, existing tests still pass. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [x] 1.1. 既存コンポーネントの MUI 置き換え: IssueDetail
  - File: `web/src/components/issue-detail.tsx`
  - インラインスタイルの `styles` オブジェクトを削除し、MUI コンポーネントに置き換える
  - Chip (state badge, repo badge, labels), Avatar, Typography, TextField, Button, Alert, Link, IconButton, Stack, Box 等を使用
  - Purpose: 既存コンポーネントを MUI に統一
  - _Leverage: web/src/components/issue-detail.tsx_
  - _Requirements: 全体_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with MUI experience | Task: Refactor web/src/components/issue-detail.tsx to use MUI components instead of inline styles. Replace: (1) state badge → MUI Chip with color prop, (2) repo badge → MUI Chip variant="outlined", (3) close button → MUI IconButton, (4) title → MUI Typography, (5) labels → MUI Chip with sx background color, (6) assignees → MUI Avatar + Typography, (7) body → MUI Typography, (8) form inputs → MUI TextField, (9) form buttons → MUI Button with color="success"/"error", (10) error text → MUI Alert severity="error", (11) GitHub link → MUI Link, (12) layout → MUI Stack/Box. Remove the entire `styles` const object. Keep the same visual appearance as much as possible. Ensure the panel width remains 280px. | Restrictions: Do not change component props or behavior. Only change styling approach. Keep isLightColor utility function. Ensure existing Storybook stories still work. | _Leverage: web/src/components/issue-detail.tsx_ | Success: Component renders identically, no inline style objects remain, all MUI components used correctly, existing tests pass. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [x] 1.2. 既存コンポーネントの MUI 置き換え: FilterPanel
  - File: `web/src/components/filter-panel.tsx`
  - インラインスタイルを MUI コンポーネントに置き換える
  - TextField, Select/MenuItem, FormControl, InputLabel, Stack, Box 等を使用
  - Purpose: 既存コンポーネントを MUI に統一
  - _Leverage: web/src/components/filter-panel.tsx_
  - _Requirements: 全体_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with MUI experience | Task: Refactor web/src/components/filter-panel.tsx to use MUI components instead of inline styles. Replace: (1) owner input → MUI TextField, (2) state selector → MUI Select + MenuItem, (3) project selector → MUI Select + MenuItem, (4) field filters → MUI Select + MenuItem with FormControl/InputLabel, (5) layout → MUI Stack/Box. Remove inline style objects. Keep the same visual layout (horizontal bar at top). | Restrictions: Do not change component props or behavior. Only change styling approach. Ensure existing functionality (project change resets filters) still works. | _Leverage: web/src/components/filter-panel.tsx_ | Success: Component renders with same layout, all inline styles removed, MUI components used, existing behavior preserved. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [x] 1.3. 既存コンポーネントの MUI 置き換え: IssueGraph のコンテキストメニュー
  - File: `web/src/components/issue-graph.tsx`
  - 既存のノードコンテキストメニュー（Select Descendants / Select Ancestors / Layout Selected）を MUI Menu/MenuItem に置き換える
  - Purpose: 既存コンポーネントを MUI に統一し、新規 PaneContextMenu と見た目を揃える
  - _Leverage: web/src/components/issue-graph.tsx_
  - _Requirements: コンテキストメニュー_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with MUI experience | Task: Refactor the existing node context menu in web/src/components/issue-graph.tsx to use MUI Menu, MenuItem, and Divider instead of inline-styled div/button elements. Replace contextMenu styles (contextMenu, contextMenuItem, contextMenuDivider) with MUI components. Use MUI Menu's anchorReference="anchorPosition" with anchorPosition={{ top: y, left: x }}. Keep existing menu items: "Select Descendants", "Select Ancestors", divider, "Layout Selected". Remove the related inline style entries from the graphStyles object. | Restrictions: Do not change menu behavior or callbacks. Only change styling approach. Keep the existing onNodeContextMenu handler. | _Leverage: web/src/components/issue-graph.tsx_ | Success: Node context menu renders with MUI styling, same behavior preserved, inline context menu styles removed. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [x] 2. 新規型定義の追加
  - File: `web/src/types/issue.ts`
  - `IssueTemplate`, `CreateIssueParams`, `ProjectFieldUpdate`, `SearchResult`, `PaneContextMenuState` を追加
  - Purpose: Issue 作成・検索機能で使用する TypeScript 型を定義
  - _Leverage: web/src/types/issue.ts, web/src/types/project.ts_
  - _Requirements: 全体_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer | Task: Add new type definitions to web/src/types/issue.ts as specified in design.md: IssueTemplate (name, title, body, about), CreateIssueParams (owner, repo, title, body?, assignees?), ProjectFieldUpdate (fieldId, value), SearchResult (number, title, state, owner, repo, nodeId, isPullRequest), PaneContextMenuState (x, y, flowX, flowY). | Restrictions: Do not modify existing types. Follow project naming conventions (PascalCase for types). | _Leverage: web/src/types/issue.ts, web/src/types/project.ts, .spec-workflow/specs/issue-creation/design.md_ | _Requirements: 全体_ | Success: All types compile without errors, are exported correctly. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [x] 3. useProjectMutations hook の作成
  - File: `web/src/hooks/use-project-mutations.ts`
  - `addToProject(projectId, contentNodeId)`: GraphQL `addProjectV2ItemById` でプロジェクトにアイテム追加
  - `updateFieldValue(projectId, itemId, fieldId, value)`: GraphQL `updateProjectV2ItemFieldValue` でフィールド値更新
  - キャッシュ無効化、ローディング・エラー状態管理
  - Purpose: プロジェクトへのアイテム追加とフィールド値更新の hook
  - _Leverage: web/src/hooks/use-issue-mutations.ts, web/src/api-client/index.ts_
  - _Requirements: Issue の作成, 既存 Issue の追加, 既存 PR の追加_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer specializing in custom hooks | Task: Create web/src/hooks/use-project-mutations.ts with two mutation functions: (1) addToProject using GraphQL addProjectV2ItemById mutation that returns the ProjectV2 item ID, (2) updateFieldValue using GraphQL updateProjectV2ItemFieldValue mutation for SINGLE_SELECT and ITERATION field types. Follow the existing wrap pattern from use-issue-mutations.ts for error handling, loading state, and cache invalidation. | Restrictions: Do not modify existing hooks. Reuse existing api-client functions (graphql). Follow the same pattern as use-issue-mutations.ts (wrap callback, loading/error state, onSuccess callback). | _Leverage: web/src/hooks/use-issue-mutations.ts, web/src/api-client/index.ts, .spec-workflow/specs/issue-creation/design.md_ | _Requirements: Issue の作成, 既存 Issue の追加, 既存 PR の追加_ | Success: Hook compiles, addToProject returns item ID, updateFieldValue works for SINGLE_SELECT and ITERATION types, proper error/loading states. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [x] 4. useIssueCreation hook の作成
  - File: `web/src/hooks/use-issue-creation.ts`
  - `createIssue(params)`: REST POST でIssue作成、レスポンスから node_id を返す
  - `fetchTemplates(owner, repo)`: GraphQL `repository.issueTemplates` でテンプレート取得
  - `fetchCollaborators(owner, repo)`: REST GET でコラボレーター取得
  - Purpose: Issue 作成に必要な API 呼び出しをまとめた hook
  - _Leverage: web/src/hooks/use-issue-mutations.ts, web/src/api-client/index.ts_
  - _Requirements: Issue の作成_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer specializing in custom hooks and GitHub API | Task: Create web/src/hooks/use-issue-creation.ts with three functions: (1) createIssue using REST POST /repos/{owner}/{repo}/issues returning the created issue including node_id, (2) fetchTemplates using GraphQL repository.issueTemplates query returning name/title/body/about fields, (3) fetchCollaborators using REST GET /repos/{owner}/{repo}/collaborators returning login and avatarUrl. Handle errors gracefully - template fetch failure should not block issue creation, collaborator fetch failure should allow manual input. | Restrictions: Do not modify existing hooks. Reuse existing api-client functions (restPost, restGet, graphql). Template fetch errors should be silently handled. | _Leverage: web/src/hooks/use-issue-mutations.ts, web/src/api-client/index.ts, .spec-workflow/specs/issue-creation/design.md_ | _Requirements: Issue の作成_ | Success: createIssue creates issue and returns node_id, fetchTemplates returns templates or empty array on error, fetchCollaborators returns collaborators or empty array on error. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [x] 5. useItemSearch hook の作成
  - File: `web/src/hooks/use-item-search.ts`
  - `search(query, owner, type)`: REST GET `/search/issues` で Issue/PR を検索
  - デバウンス処理、ローディング・エラー状態管理
  - Purpose: 既存 Issue/PR の検索 hook
  - _Leverage: web/src/api-client/index.ts_
  - _Requirements: 既存 Issue の追加, 既存 PR の追加_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer | Task: Create web/src/hooks/use-item-search.ts with a search function using REST GET /search/issues with query parameters (q={query}+user:{owner}+type:{issue|pr}). Implement debounce (300ms) to avoid excessive API calls during typing. Parse results into SearchResult type (number, title, state, owner, repo, nodeId, isPullRequest). Track loading and error states. | Restrictions: Do not modify existing hooks. Reuse existing api-client restGet function. Debounce should cancel previous pending requests. | _Leverage: web/src/api-client/index.ts, web/src/types/issue.ts, .spec-workflow/specs/issue-creation/design.md_ | _Requirements: 既存 Issue の追加, 既存 PR の追加_ | Success: Search returns results matching query, debounce works correctly, loading/error states are tracked, results parse into SearchResult type. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [x] 6. PaneContextMenu コンポーネントの作成
  - File: `web/src/components/pane-context-menu.tsx`
  - MUI の `Menu`, `MenuItem`, `Divider` を使用
  - 「新規作成」グループ: 「Issue を作成」
  - 「既存を追加」グループ: 「Issue を追加」「PR を追加」
  - Purpose: グラフ空白領域の右クリックメニュー
  - _Leverage: web/src/components/issue-graph.tsx (既存のコンテキストメニューパターン)_
  - _Requirements: コンテキストメニュー_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer with MUI experience | Task: Create web/src/components/pane-context-menu.tsx using MUI Menu, MenuItem, ListSubheader, and Divider. The menu has two groups: "新規作成" with "Issue を作成", and "既存を追加" with "Issue を追加" and "PR を追加". Props: anchorPosition (x, y), open boolean, onClose, onCreateIssue, onAddIssue, onAddPR callbacks. Use MUI Menu's anchorReference="anchorPosition" for positioning at the right-click location. | Restrictions: Do not modify existing components. Keep component focused on menu display only (no business logic). Follow kebab-case file naming. | _Leverage: web/src/components/issue-graph.tsx, .spec-workflow/specs/issue-creation/design.md_ | _Requirements: コンテキストメニュー_ | Success: Menu displays at right-click position with correct groups, callbacks fire correctly, menu closes on selection or click outside. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [x] 7. IssueCreateForm コンポーネントの作成
  - File: `web/src/components/issue-create-form.tsx`
  - MUI の `Autocomplete`, `Select`, `TextField`, `Button`, `Alert` を使用
  - リポジトリ選択（Autocomplete freeSolo）、テンプレート選択（Select）、タイトル（TextField）、本文（TextField multiline）、Assignees（Autocomplete multiple）、プロジェクトフィールド（Select）
  - テンプレート選択時にタイトル・本文をプリフィル
  - 送信時に createIssue → addToProject → updateFieldValues を順に実行
  - Purpose: Issue 作成フォーム（右サイドパネル）
  - _Leverage: web/src/components/issue-detail.tsx, web/src/hooks/use-issue-creation.ts, web/src/hooks/use-project-mutations.ts_
  - _Requirements: Issue の作成_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer with MUI forms experience | Task: Create web/src/components/issue-create-form.tsx as a right side panel form. Props: repos (string[] of owner/repo), projectId, projectFields (ProjectField[]), onSuccess callback, onClose. Use hooks: useIssueCreation for createIssue/fetchTemplates/fetchCollaborators, useProjectMutations for addToProject/updateFieldValue. Form fields: (1) Repository Autocomplete with freeSolo, (2) Template Select loaded on repo change, (3) Title TextField required, (4) Body TextField multiline, (5) Assignees Autocomplete multiple loaded on repo change, (6) Project field Selects for SINGLE_SELECT/ITERATION fields. On submit: createIssue → addToProject → updateFieldValues sequentially. Show MUI Alert on error, preserve form inputs. Show loading state on Button during submission. | Restrictions: Do not modify existing components. Match styling with existing issue-detail.tsx panel width (280px). Handle partial failures (issue created but project add fails). | _Leverage: web/src/components/issue-detail.tsx, web/src/hooks/use-issue-creation.ts, web/src/hooks/use-project-mutations.ts, .spec-workflow/specs/issue-creation/design.md_ | _Requirements: Issue の作成_ | Success: Form displays all fields, template selection prefills title/body, submission creates issue and adds to project with field values, errors display correctly, form preserves input on error. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [x] 8. ItemSearchForm コンポーネントの作成
  - File: `web/src/components/item-search-form.tsx`
  - MUI の `Autocomplete` (async) を使用してインクリメンタルサーチ
  - Issue 検索モードと PR 検索モードを props で切り替え
  - 選択時に addToProject を実行
  - Purpose: 既存 Issue/PR 検索・追加フォーム（右サイドパネル）
  - _Leverage: web/src/hooks/use-item-search.ts, web/src/hooks/use-project-mutations.ts_
  - _Requirements: 既存 Issue の追加, 既存 PR の追加_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer with MUI experience | Task: Create web/src/components/item-search-form.tsx as a right side panel form. Props: type ("issue" or "pr"), owner, projectId, onSuccess callback, onClose. Use MUI Autocomplete in async mode with useItemSearch hook for incremental search. Display results showing number, title, state, and repo. On selection, call useProjectMutations.addToProject with the selected item's nodeId. Show loading/error states. | Restrictions: Do not modify existing components. Match styling with existing issue-detail.tsx panel. Keep component focused - no issue creation logic here. | _Leverage: web/src/hooks/use-item-search.ts, web/src/hooks/use-project-mutations.ts, web/src/components/issue-detail.tsx, .spec-workflow/specs/issue-creation/design.md_ | _Requirements: 既存 Issue の追加, 既存 PR の追加_ | Success: Search works with debounce, results display correctly, selection adds item to project, loading/error states shown. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [ ] 9. issue-graph.tsx にコンテキストメニュー統合
  - File: `web/src/components/issue-graph.tsx`
  - `onPaneContextMenu` ハンドラを ReactFlow に追加
  - 右クリック位置のクライアント座標と React Flow 座標を取得・保持
  - PaneContextMenu コンポーネントの表示制御
  - メニュー選択時のコールバックを親（issue-dashboard）に伝播
  - Purpose: グラフ空白領域の右クリックイベントをハンドルし、コンテキストメニューを表示
  - _Leverage: web/src/components/issue-graph.tsx, web/src/components/pane-context-menu.tsx_
  - _Requirements: コンテキストメニュー_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer with React Flow experience | Task: Modify web/src/components/issue-graph.tsx to add onPaneContextMenu handler to ReactFlow. Use screenToFlowPosition to convert client coordinates to flow coordinates. Store both in PaneContextMenuState. Render PaneContextMenu component conditionally. Add new props: onCreateIssue(flowPosition), onAddIssue(flowPosition), onAddPR(flowPosition) that receive the flow position where the context menu was opened. Close context menu on pane click. | Restrictions: Do not break existing node context menu functionality. Keep existing onNodeContextMenu handler intact. Minimize changes to existing code. | _Leverage: web/src/components/issue-graph.tsx, web/src/components/pane-context-menu.tsx, .spec-workflow/specs/issue-creation/design.md_ | _Requirements: コンテキストメニュー_ | Success: Right-click on empty area shows PaneContextMenu, right-click on node still shows existing node context menu, menu callbacks pass flow position, menu closes on selection or click. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [ ] 10. issue-dashboard.tsx にサイドパネル状態管理を統合
  - File: `web/src/components/issue-dashboard.tsx`
  - サイドパネルの状態を管理: `"detail"` | `"create-issue"` | `"search-issue"` | `"search-pr"` | `null`
  - コンテキストメニューからのコールバック受信、適切なフォーム表示
  - フォーム成功時のキャッシュ無効化・再取得、ノード位置の設定
  - Purpose: 全体のフロー統合（コンテキストメニュー → フォーム → API → グラフ更新）
  - _Leverage: web/src/components/issue-dashboard.tsx, web/src/components/issue-create-form.tsx, web/src/components/item-search-form.tsx_
  - _Requirements: 全体_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Senior React Developer | Task: Modify web/src/components/issue-dashboard.tsx to manage side panel state. Add state for panel mode ("detail" | "create-issue" | "search-issue" | "search-pr" | null) and pendingNodePosition (flow coordinates from context menu). Wire up IssueGraph's new callbacks (onCreateIssue, onAddIssue, onAddPR) to set panel mode and store flow position. Render IssueCreateForm or ItemSearchForm in the side panel area based on mode. On form success: invalidate cache, trigger re-fetch, save the pending flow position as node position for the newly added item via cachePutNodePositions. Extract unique repos from current issues for the create form's repo list. Pass projectId, projectFields, and owner to the forms. | Restrictions: Do not break existing IssueDetail panel - it should still work when clicking a node. Minimize changes to existing state management. | _Leverage: web/src/components/issue-dashboard.tsx, web/src/components/issue-create-form.tsx, web/src/components/item-search-form.tsx, .spec-workflow/specs/issue-creation/design.md_ | _Requirements: 全体_ | Success: Context menu → form → API → graph update flow works end-to-end. IssueDetail still works. New nodes appear at right-click position. Cache is properly invalidated. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [x] 11. Hook のユニットテスト
  - File: `web/src/hooks/use-project-mutations.test.ts`, `web/src/hooks/use-issue-creation.test.ts`, `web/src/hooks/use-item-search.test.ts`
  - 各 hook の成功・失敗ケース、エラーハンドリングのテスト
  - Purpose: Hook の信頼性を確保
  - _Leverage: web/src/hooks/use-issue-mutations.test.ts (既存テストパターン)_
  - _Requirements: 全体_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with React testing experience | Task: Create unit tests for three hooks: (1) use-project-mutations.test.ts - test addToProject success/failure, updateFieldValue for SINGLE_SELECT and ITERATION, cache invalidation. (2) use-issue-creation.test.ts - test createIssue success/failure, fetchTemplates success/failure/empty, fetchCollaborators success/failure. (3) use-item-search.test.ts - test search with debounce, result parsing, error handling. Follow the existing test patterns from use-issue-mutations.test.ts using MSW for API mocking. | Restrictions: Follow existing test patterns exactly. Use MSW for mocking. Do not test implementation details, test behavior. | _Leverage: web/src/hooks/use-issue-mutations.test.ts, .spec-workflow/specs/issue-creation/design.md_ | _Requirements: 全体_ | Success: All tests pass, cover success and failure cases, mock APIs correctly. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._

- [ ] 12. コンポーネントの Storybook テスト
  - File: `web/src/components/pane-context-menu.stories.tsx`, `web/src/components/issue-create-form.stories.tsx`, `web/src/components/item-search-form.stories.tsx`
  - 各コンポーネントの Storybook ストーリー作成
  - Purpose: コンポーネントのビジュアル確認とインタラクションテスト
  - _Leverage: web/src/components/issue-graph.stories.tsx (既存 Storybook パターン)_
  - _Requirements: 全体_
  - _Prompt: Implement the task for spec issue-creation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with Storybook experience | Task: Create Storybook stories for: (1) pane-context-menu.stories.tsx - default state, open state. (2) issue-create-form.stories.tsx - empty form, with templates, with collaborators, loading state, error state. (3) item-search-form.stories.tsx - issue mode, PR mode, with search results, loading state, error state. Use MSW handlers to mock API responses. Follow existing story patterns from issue-graph.stories.tsx. | Restrictions: Follow existing Storybook patterns. Use MSW for API mocking in stories. | _Leverage: web/src/components/issue-graph.stories.tsx, .spec-workflow/specs/issue-creation/design.md_ | _Requirements: 全体_ | Success: All stories render correctly, interactions work, MSW mocks provide realistic data. | After completing the task, mark it as in-progress in tasks.md before starting, log the implementation with log-implementation tool, then mark as complete._
