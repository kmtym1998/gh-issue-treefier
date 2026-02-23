import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cacheFlush } from "../api-client";
import { useFilterQueryParams } from "../hooks/use-filter-query-params";
import { useIssueMutations } from "../hooks/use-issue-mutations";
import { useOptimisticIssues } from "../hooks/use-optimistic-issues";
import { usePendingNodePositions } from "../hooks/use-pending-node-positions";
import { buildIssueId, useProjectIssues } from "../hooks/use-project-issues";
import { useProjectFields } from "../hooks/use-projects";
import type { Dependency, DependencyType, Issue } from "../types/issue";
import { FilterPanel, type FilterValues } from "./filter-panel";
import { IssueCreateForm } from "./issue-create-form";
import { IssueDetail } from "./issue-detail";
import { IssueGraph } from "./issue-graph";
import { ItemSearchForm } from "./item-search-form";

export function IssueDashboard() {
  const { initialFilters, syncToUrl } = useFilterQueryParams();

  const [filters, setFilters] = useState<FilterValues>({
    owner: "",
    state: "open",
    projectId: "",
    fieldFilters: {},
    ...initialFilters,
  });
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<
    "create-issue" | "search-issue" | "search-pr" | null
  >(null);

  // TODO: optimisticOps 関連のロジック (depKey, graphDependencies, cleanup effect,
  // addDependency, removeDependency) を useOptimisticDependencies フックに抽出する。
  // useOptimisticIssues と同じパターン (サーバーデータ + 楽観データのマージ + クリーンアップ)
  // で約50行削減できる。
  const [optimisticOps, setOptimisticOps] = useState<{
    added: Dependency[];
    removed: Dependency[];
  }>({ added: [], removed: [] });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isFlushing, setIsFlushing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const flushingRef = useRef(false);
  const createIssueBasePositionRef = useRef<{ x: number; y: number } | null>(
    null,
  );
  const handleFlush = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    setIsFlushing(true);
    try {
      await cacheFlush();
      setLastSavedAt(new Date());
    } finally {
      setIsFlushing(false);
      flushingRef.current = false;
    }
  }, []);

  // Cmd+S / Ctrl+S でインメモリキャッシュをディスクに保存
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleFlush();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleFlush]);

  const handleFilterChange = useCallback(
    (next: FilterValues) => {
      setFilters(next);
      setSelectedIssueId(null);
      syncToUrl(next);
    },
    [syncToUrl],
  );

  const { issues, dependencies, loading, isRevalidating, error, refetch } =
    useProjectIssues({
      ...filters,
    });

  const { fields: projectFields } = useProjectFields(filters.projectId);

  const mutations = useIssueMutations(filters.projectId);

  const { allIssues, addOptimisticIssue } = useOptimisticIssues(issues);
  const {
    pendingNodePositions,
    reservePosition,
    assignReservedPosition,
    clearReservedPosition,
  } = usePendingNodePositions(filters.projectId, allIssues);

  const repos = useMemo(
    () => [...new Set(allIssues.map((i) => `${i.owner}/${i.repo}`))],
    [allIssues],
  );

  // TODO: depKey は依存配列 [] の純粋関数なので useCallback で包む必要がない。
  // コンポーネント外の plain function に変更すべき。
  // そうすれば graphDependencies, cleanup effect, addDependency, removeDependency の
  // deps からも除外できてコードが簡潔になる。
  const depKey = useCallback(
    (dep: Dependency) => `${dep.type}:${dep.source}->${dep.target}`,
    [],
  );

  // サーバーデータ (dependencies) + 楽観的更新 (optimisticOps) から同期的に導出。
  // useEffect 経由の非同期同期だと初回レンダーで dependencies=[] になりレイアウトが壊れる。
  const graphDependencies = useMemo(() => {
    let result = [...dependencies];
    for (const dep of optimisticOps.added) {
      if (!result.some((d) => depKey(d) === depKey(dep))) {
        result.push(dep);
      }
    }
    result = result.filter(
      (d) => !optimisticOps.removed.some((r) => depKey(r) === depKey(d)),
    );
    return result;
  }, [dependencies, optimisticOps, depKey]);

  // サーバーデータが更新されたら確認済みの楽観的更新をクリア
  useEffect(() => {
    setOptimisticOps((prev) => ({
      added: prev.added.filter(
        (a) => !dependencies.some((d) => depKey(d) === depKey(a)),
      ),
      removed: prev.removed.filter((r) =>
        dependencies.some((d) => depKey(d) === depKey(r)),
      ),
    }));
  }, [dependencies, depKey]);

  const addDependency = useCallback(
    (dep: Dependency) => {
      setOptimisticOps((prev) => ({
        added: prev.added.some((a) => depKey(a) === depKey(dep))
          ? prev.added
          : [...prev.added, dep],
        removed: prev.removed.filter((r) => depKey(r) !== depKey(dep)),
      }));
    },
    [depKey],
  );

  const removeDependency = useCallback(
    (dep: Dependency) => {
      setOptimisticOps((prev) => ({
        added: prev.added.filter((a) => depKey(a) !== depKey(dep)),
        removed: prev.removed.some((r) => depKey(r) === depKey(dep))
          ? prev.removed
          : [...prev.removed, dep],
      }));
    },
    [depKey],
  );

  const reportMutationError = useCallback((err: unknown, action: string) => {
    const message = err instanceof Error ? err.message : String(err);
    setMutationError(`${action}に失敗しました: ${message}`);
  }, []);

  // TODO: parseIssueId を use-project-issues.ts から import する (buildIssueId の隣に定義)
  const parseIssueId = useCallback((id: string) => {
    const [ownerRepo, num] = id.split("#");
    const [owner, repo] = ownerRepo.split("/");
    return { owner, repo, number: Number.parseInt(num, 10) };
  }, []);

  const handleEdgeDelete = useCallback(
    (source: string, target: string, type: DependencyType) => {
      setMutationError(null);
      const dep: Dependency = { source, target, type };
      removeDependency(dep);

      if (type === "blocked_by") {
        // source=blocker, target=blocked
        const blocker = parseIssueId(source);
        const blocked = parseIssueId(target);
        mutations
          .removeBlockedBy(
            blocked.owner,
            blocked.repo,
            blocked.number,
            blocker.number,
          )
          .catch((err) => {
            addDependency(dep);
            reportMutationError(err, "依存関係の削除");
          });
      } else {
        const parent = parseIssueId(source);
        const child = parseIssueId(target);
        mutations
          .removeSubIssue(
            parent.owner,
            parent.repo,
            parent.number,
            child.number,
          )
          .catch((err) => {
            addDependency(dep);
            reportMutationError(err, "依存関係の削除");
          });
      }
    },
    [
      addDependency,
      mutations,
      parseIssueId,
      removeDependency,
      reportMutationError,
    ],
  );

  const handleEdgeAdd = useCallback(
    (source: string, target: string, type: DependencyType) => {
      setMutationError(null);
      const dep: Dependency = { source, target, type };
      addDependency(dep);

      if (type === "blocked_by") {
        const blocker = parseIssueId(source);
        const blocked = parseIssueId(target);
        mutations
          .addBlockedBy(
            blocked.owner,
            blocked.repo,
            blocked.number,
            blocker.number,
          )
          .catch((err) => {
            removeDependency(dep);
            reportMutationError(err, "依存関係の追加");
          });
      } else {
        const parent = parseIssueId(source);
        const child = parseIssueId(target);
        mutations
          .addSubIssue(parent.owner, parent.repo, parent.number, child.number)
          .catch((err) => {
            removeDependency(dep);
            reportMutationError(err, "依存関係の追加");
          });
      }
    },
    [
      addDependency,
      mutations,
      parseIssueId,
      removeDependency,
      reportMutationError,
    ],
  );

  const handleAddSubIssue = useCallback(
    async (
      owner: string,
      repo: string,
      parentNumber: number,
      childNumber: number,
    ) => {
      setMutationError(null);
      const dep: Dependency = {
        source: buildIssueId(owner, repo, parentNumber),
        target: buildIssueId(owner, repo, childNumber),
        type: "sub_issue",
      };
      addDependency(dep);
      try {
        await mutations.addSubIssue(owner, repo, parentNumber, childNumber);
      } catch (err) {
        removeDependency(dep);
        reportMutationError(err, "サブイシューの追加");
        throw err;
      }
    },
    [addDependency, mutations, removeDependency, reportMutationError],
  );

  const handleAddBlockedBy = useCallback(
    async (
      owner: string,
      repo: string,
      issueNumber: number,
      blockerNumber: number,
    ) => {
      setMutationError(null);
      const dep: Dependency = {
        source: buildIssueId(owner, repo, blockerNumber),
        target: buildIssueId(owner, repo, issueNumber),
        type: "blocked_by",
      };
      addDependency(dep);
      try {
        await mutations.addBlockedBy(owner, repo, issueNumber, blockerNumber);
      } catch (err) {
        removeDependency(dep);
        reportMutationError(err, "Blocked-by の追加");
        throw err;
      }
    },
    [addDependency, mutations, removeDependency, reportMutationError],
  );

  const handleNodeClick = useCallback((issueId: string | null) => {
    setSelectedIssueId(issueId);
    setPanelMode(null);
  }, []);

  const handleCreateIssue = useCallback(
    (flowPos: { x: number; y: number }) => {
      createIssueBasePositionRef.current = flowPos;
      reservePosition(flowPos);
      setSelectedIssueId(null);
      setPanelMode("create-issue");
    },
    [reservePosition],
  );

  const handleAddIssue = useCallback(
    (flowPos: { x: number; y: number }) => {
      reservePosition(flowPos);
      setSelectedIssueId(null);
      setPanelMode("search-issue");
    },
    [reservePosition],
  );

  const handleAddPR = useCallback(
    (flowPos: { x: number; y: number }) => {
      reservePosition(flowPos);
      setSelectedIssueId(null);
      setPanelMode("search-pr");
    },
    [reservePosition],
  );

  // ノード高 + マージン。issue-graph.tsx の NODE_HEIGHT(40) + 間隔(60)
  const CONTINUE_CREATE_Y_OFFSET = 100;

  const handleCreateIssueSuccess = useCallback(
    (issue: Issue, continueCreating: boolean) => {
      assignReservedPosition(issue.id);
      addOptimisticIssue(issue);
      refetch();
      if (continueCreating) {
        const basePos = createIssueBasePositionRef.current;
        if (basePos) {
          const nextPos = {
            x: basePos.x,
            y: basePos.y + CONTINUE_CREATE_Y_OFFSET,
          };
          createIssueBasePositionRef.current = nextPos;
          reservePosition(nextPos);
        }
      } else {
        setPanelMode(null);
      }
    },
    [assignReservedPosition, addOptimisticIssue, refetch, reservePosition],
  );

  const handleSearchFormSuccess = useCallback(() => {
    refetch();
    setPanelMode(null);
  }, [refetch]);

  const handleIssueUpdate = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleFormClose = useCallback(() => {
    setPanelMode(null);
    clearReservedPosition();
  }, [clearReservedPosition]);

  const selectedIssue = useMemo(
    () => allIssues.find((i) => i.id === selectedIssueId) ?? null,
    [allIssues, selectedIssueId],
  );

  const hasQuery = filters.owner !== "" && filters.projectId !== "";

  return (
    <div style={styles.root}>
      <FilterPanel
        defaultValues={initialFilters}
        onChange={handleFilterChange}
      />

      <div style={styles.main}>
        <div style={styles.graphArea}>
          {!hasQuery && (
            <p style={styles.placeholder}>
              Owner を入力し Project を選択して Issue を表示
            </p>
          )}

          {hasQuery && loading && <p style={styles.placeholder}>Loading...</p>}

          {hasQuery && error && (
            <p style={styles.error}>Error: {error.message}</p>
          )}

          {hasQuery && !loading && !error && allIssues.length === 0 && (
            <p style={styles.placeholder}>Issue が見つかりませんでした</p>
          )}

          {hasQuery && !loading && allIssues.length > 0 && (
            <>
              {isRevalidating && (
                <span style={styles.revalidating}>更新中...</span>
              )}
              <IssueGraph
                issues={allIssues}
                dependencies={graphDependencies}
                projectId={filters.projectId}
                projectFields={projectFields}
                pendingNodePositions={pendingNodePositions}
                onNodeClick={handleNodeClick}
                onEdgeDelete={handleEdgeDelete}
                onEdgeAdd={handleEdgeAdd}
                onCreateIssue={handleCreateIssue}
                onAddIssue={handleAddIssue}
                onAddPR={handleAddPR}
              />
            </>
          )}

          {hasQuery && !loading && mutationError && (
            <p style={styles.error}>{mutationError}</p>
          )}

          <div style={styles.saveStatus}>
            {isFlushing ? (
              <span>保存中...</span>
            ) : lastSavedAt ? (
              <span>最終保存: {lastSavedAt.toLocaleTimeString()}</span>
            ) : null}
          </div>
        </div>

        {panelMode === "create-issue" && (
          <IssueCreateForm
            repos={repos}
            projectId={filters.projectId}
            projectFields={projectFields}
            onSuccess={handleCreateIssueSuccess}
            onClose={handleFormClose}
          />
        )}
        {panelMode === "search-issue" && (
          <ItemSearchForm
            type="issue"
            owner={filters.owner}
            projectId={filters.projectId}
            onSuccess={handleSearchFormSuccess}
            onClose={handleFormClose}
          />
        )}
        {panelMode === "search-pr" && (
          <ItemSearchForm
            type="pr"
            owner={filters.owner}
            projectId={filters.projectId}
            onSuccess={handleSearchFormSuccess}
            onClose={handleFormClose}
          />
        )}
        {panelMode === null && (
          <IssueDetail
            issue={selectedIssue}
            onClose={() => setSelectedIssueId(null)}
            onAddSubIssue={handleAddSubIssue}
            onAddBlockedBy={handleAddBlockedBy}
            onUpdate={handleIssueUpdate}
            projectId={filters.projectId}
            projectFields={projectFields}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  main: {
    display: "flex",
    flex: 1,
    minHeight: 0,
  },
  graphArea: {
    flex: 1,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  revalidating: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    color: "#656d76",
    fontSize: 12,
  },
  placeholder: {
    color: "#656d76",
    fontSize: 14,
  },
  error: {
    color: "#cf222e",
    fontSize: 14,
  },
  saveStatus: {
    position: "absolute",
    bottom: 8,
    left: 12,
    zIndex: 10,
    color: "#656d76",
    fontSize: 12,
  },
};
