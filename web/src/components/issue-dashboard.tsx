import { useCallback, useEffect, useMemo, useState } from "react";
import { useFilterQueryParams } from "../hooks/use-filter-query-params";
import { useIssueMutations } from "../hooks/use-issue-mutations";
import { buildIssueId, useProjectIssues } from "../hooks/use-project-issues";
import type { Dependency, DependencyType } from "../types/issue";
import { FilterPanel, type FilterValues } from "./filter-panel";
import { IssueDetail } from "./issue-detail";
import { IssueGraph } from "./issue-graph";

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
  const [graphDependencies, setGraphDependencies] = useState<Dependency[]>([]);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const handleFilterChange = useCallback(
    (next: FilterValues) => {
      setFilters(next);
      setSelectedIssueId(null);
      syncToUrl(next);
    },
    [syncToUrl],
  );

  const { issues, dependencies, loading, isRevalidating, error } =
    useProjectIssues({
      ...filters,
    });

  const mutations = useIssueMutations(filters.projectId);

  useEffect(() => {
    setGraphDependencies(dependencies);
  }, [dependencies]);

  const depKey = useCallback(
    (dep: Dependency) => `${dep.type}:${dep.source}->${dep.target}`,
    [],
  );

  const addDependency = useCallback(
    (dep: Dependency) => {
      setGraphDependencies((prev) =>
        prev.some((d) => depKey(d) === depKey(dep)) ? prev : [...prev, dep],
      );
    },
    [depKey],
  );

  const removeDependency = useCallback(
    (dep: Dependency) => {
      setGraphDependencies((prev) =>
        prev.filter((d) => depKey(d) !== depKey(dep)),
      );
    },
    [depKey],
  );

  const reportMutationError = useCallback((err: unknown, action: string) => {
    const message = err instanceof Error ? err.message : String(err);
    setMutationError(`${action}に失敗しました: ${message}`);
  }, []);

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

  const selectedIssue = useMemo(
    () => issues.find((i) => i.id === selectedIssueId) ?? null,
    [issues, selectedIssueId],
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

          {hasQuery && !loading && !error && issues.length === 0 && (
            <p style={styles.placeholder}>Issue が見つかりませんでした</p>
          )}

          {hasQuery && !loading && issues.length > 0 && (
            <>
              {isRevalidating && (
                <span style={styles.revalidating}>更新中...</span>
              )}
              <IssueGraph
                issues={issues}
                dependencies={graphDependencies}
                onNodeClick={setSelectedIssueId}
                onEdgeDelete={handleEdgeDelete}
                onEdgeAdd={handleEdgeAdd}
              />
            </>
          )}

          {hasQuery && !loading && mutationError && (
            <p style={styles.error}>{mutationError}</p>
          )}
        </div>

        <IssueDetail
          issue={selectedIssue}
          onClose={() => setSelectedIssueId(null)}
          onAddSubIssue={handleAddSubIssue}
          onAddBlockedBy={handleAddBlockedBy}
        />
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
};
