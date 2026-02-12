# IndexedDB キャッシュによる useProjectIssues の最適化 - 実装計画

## 背景

GitHub ProjectV2 GraphQL API は `items` コネクションにサーバーサイドフィルタをサポートしていない。
現状の `useProjectIssues` は `state` や `fieldFilters` が変わるたびに全件再取得しているが、
サーバー側でフィルタできない以上、同じデータを何度も取得しているだけで非効率。

## 目的

- raw データ (`GitHubProjectV2Item[]`) を IndexedDB にキャッシュ
- フィルタ変更時は API を叩かず `useMemo` で即座に再計算
- 同じプロジェクトへの再アクセス時はキャッシュから即座にデータ表示

## アーキテクチャ

```
projectId 変更  →  IndexedDB キャッシュ確認  →  ヒット: そのまま使用
                                                ミス: API フェッチ → キャッシュ保存
                                                          ↓
                                              rawItems (GitHubProjectV2Item[])
                                                          ↓
state/fieldFilters 変更  →  useMemo で再計算  →  { issues, dependencies }
```

## 依存パッケージ

| パッケージ | 種別 | サイズ | 用途 |
|-----------|------|-------|------|
| `idb` | 本番 | ~1.2KB gzip | IndexedDB の Promise ラッパー |
| `fake-indexeddb` | dev | - | テスト用 IndexedDB ポリフィル |

## ファイル別変更内容

### 1. 新規: `web/src/lib/idb-cache.ts`

React に依存しないスタンドアロンのキャッシュユーティリティ。

```typescript
// DB スキーマ
interface ProjectCacheSchema extends DBSchema {
  projectItems: {
    key: string;             // projectId
    value: {
      projectId: string;
      items: GitHubProjectV2Item[];
      cachedAt: number;      // Date.now() タイムスタンプ
    };
  };
}

// 定数
const DB_NAME = "gh-issue-treefier";
const DB_VERSION = 1;
const STORE_NAME = "projectItems";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5分

// エクスポート関数
getCachedItems(projectId, ttlMs?)   // TTL 期限切れなら null を返す
setCachedItems(projectId, items)    // キャッシュ書き込み
invalidateCache(projectId)          // エントリ削除
clearAllCache()                     // 全キャッシュクリア
```

**設計方針:**
- DB コネクションはシングルトン (lazy)
- 全操作 try/catch で静かに失敗 → IndexedDB 非対応環境でもアプリは通常動作
- TTL は読み取り時に判定 (バックグラウンドクリーンアップ不要)

### 2. 変更: `web/src/hooks/use-project-issues.ts`

核心の変更: **フェッチとフィルタリングの分離**

#### Before (現状)
```
useEffect([projectId, state, fieldFilters, refetchKey])
  → API 全件取得
  → matchesFieldFilters() でフィルタ
  → parseProjectItems() で変換
  → state フィルタ
  → parseProjectDependencies()
  → setIssues(), setDependencies()
```

#### After (変更後)
```
useEffect([projectId, refetchKey])       ← state, fieldFilters を除外
  → キャッシュ確認 (forceRefetch 時はスキップ)
  → ヒット: setRawItems(cached.items)
  → ミス: API 全件取得 → setRawItems(allItems) + setCachedItems()

useMemo([rawItems, state, fieldFilters]) ← フィルタは useMemo で即座に再計算
  → matchesFieldFilters()
  → parseProjectItems()
  → state フィルタ
  → return issues

useMemo([rawItems])                      ← 依存関係も useMemo
  → parseProjectDependencies()
  → return dependencies
```

**変更点の詳細:**
- state `issues`, `dependencies` → `rawItems` (`GitHubProjectV2Item[]`) に置き換え
- `useEffect` の deps: `[projectId, state, fieldFilters, refetchKey]` → `[projectId, refetchKey]`
- `refetch()`: `forceRefetchRef` (useRef) を true にしてキャッシュバイパス
- `issues`, `dependencies` は `useMemo` で `rawItems` から導出
- 既存の純粋関数 (`buildIssueId`, `parseProjectItems`, `parseProjectDependencies`, `matchesFieldFilters`) は変更なし

### 3. 変更: `web/src/hooks/use-issue-mutations.ts`

```diff
 export function useIssueMutations(
+  projectId?: string,
   onSuccess?: () => void,
 ): UseIssueMutationsResult {
   // ...
   const wrap = useCallback(
     async (fn: () => Promise<void>) => {
       // ...
       try {
         await fn();
+        if (projectId) {
+          invalidateCache(projectId);
+        }
         onSuccess?.();
       } catch (err) { /* ... */ }
     },
-    [onSuccess],
+    [projectId, onSuccess],
   );
```

**invalidate (削除) する理由:**
- Mutation レスポンスには完全な `GitHubProjectV2Item` が含まれないため、キャッシュのインプレース更新は困難
- Dashboard は既に楽観的 UI 更新を行っているので、ユーザー体験への影響なし
- 次回の `refetch()` または TTL 期限切れで最新データが取得される

### 4. 変更: `web/src/components/issue-dashboard.tsx`

1行変更のみ:

```diff
-  const mutations = useIssueMutations();
+  const mutations = useIssueMutations(filters.projectId);
```

### 5. 新規: `web/src/lib/idb-cache.test.ts`

`fake-indexeddb/auto` を使った単体テスト:

- `getCachedItems`: 存在しないキーで null
- `setCachedItems` + `getCachedItems`: ラウンドトリップ
- TTL: 期限切れ後に null (`vi.useFakeTimers()` 使用)
- `invalidateCache`: エントリ削除
- `clearAllCache`: 全エントリ削除
- IndexedDB エラー時: throw せず null / no-op

## 変更しないファイル

| ファイル | 理由 |
|---------|------|
| `web/src/types/github.ts` | 型定義変更なし |
| `web/src/types/issue.ts` | 型定義変更なし |
| `web/src/api-client/index.ts` | API 層変更なし |
| `web/src/hooks/use-project-issues.test.ts` | 純粋関数テスト、そのまま動作 |
| `web/src/hooks/use-issue-mutations.test.ts` | スタンドアロン関数テスト、影響なし |

## エッジケース

| ケース | 対処 |
|-------|------|
| IndexedDB 非対応 (プライベートブラウジング等) | try/catch で静かに失敗、通常のフェッチにフォールバック |
| 大量データ (1000 issues) | ~2MB 程度、IndexedDB の容量制限内 |
| 複数タブ | IndexedDB は同一オリジンで共有。invalidate 後は他タブもキャッシュミス |
| Mutation 後の stale write | TTL で自然に解消。完全防止にはジェネレーションカウンタが必要だが複雑さに見合わない |

## 実装順序

1. `npm install idb && npm install --save-dev fake-indexeddb`
2. `web/src/lib/idb-cache.ts` 作成
3. `web/src/lib/idb-cache.test.ts` 作成 → テスト実行
4. `web/src/hooks/use-project-issues.ts` リファクタ → 既存テスト確認
5. `web/src/hooks/use-issue-mutations.ts` に `projectId` 追加
6. `web/src/components/issue-dashboard.tsx` を1行修正
7. `npm run build` で型チェック、`npm test` で全テストパス確認

## 検証方法

1. **ビルド**: `npm run build` で型エラーなし
2. **テスト**: `npm test` で既存・新規テスト全パス
3. **手動確認**:
   - フィルタ (state/field) 変更時に DevTools Network タブで API リクエストが飛ばないこと
   - 同じプロジェクトに5分以内に戻ったときキャッシュヒット (API リクエストなし)
   - `refetch` ボタンで強制再取得されること
   - Mutation 成功後、refetch でキャッシュが更新されること
   - シークレットウィンドウでも正常動作すること (キャッシュなしフォールバック)
