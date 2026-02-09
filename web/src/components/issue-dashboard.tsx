import { useCallback, useMemo, useState } from "react";
import { useIssueMutations } from "../hooks/use-issue-mutations";
import { useProjectIssues } from "../hooks/use-project-issues";
import { FilterPanel, type FilterValues } from "./filter-panel";
import { IssueDetail } from "./issue-detail";
import { IssueGraph } from "./issue-graph";

function getQueryParams(): Partial<FilterValues> {
  const params = new URLSearchParams(window.location.search);
  const result: Partial<FilterValues> = {};

  const owner = params.get("owner");
  if (owner) result.owner = owner;

  const projectId = params.get("project_id");
  if (projectId) result.projectId = projectId;

  return result;
}

export function IssueDashboard() {
  const queryParams = useMemo(() => getQueryParams(), []);

  const [filters, setFilters] = useState<FilterValues>({
    owner: "",
    state: "open",
    projectId: "",
    fieldFilters: {},
    ...queryParams,
  });
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const handleFilterChange = useCallback((next: FilterValues) => {
    setFilters(next);
    setSelectedIssueId(null);
  }, []);

  const { issues, dependencies, loading, error, refetch } = useProjectIssues({
    projectId: filters.projectId,
    state: filters.state,
    fieldFilters: filters.fieldFilters,
  });

  const mutations = useIssueMutations(refetch);

  const handleEdgeDelete = useCallback(
    (source: string, target: string) => {
      // source/target は "owner/repo#number" 形式
      const parseId = (id: string) => {
        const [ownerRepo, num] = id.split("#");
        const [owner, repo] = ownerRepo.split("/");
        return { owner, repo, number: Number.parseInt(num, 10) };
      };
      const parent = parseId(source);
      const child = parseId(target);
      mutations.removeSubIssue(
        parent.owner,
        parent.repo,
        parent.number,
        child.number,
      );
    },
    [mutations],
  );

  const selectedIssue = useMemo(
    () => issues.find((i) => i.id === selectedIssueId) ?? null,
    [issues, selectedIssueId],
  );

  const hasQuery = filters.owner !== "" && filters.projectId !== "";

  return (
    <div style={styles.root}>
      <FilterPanel defaultValues={queryParams} onChange={handleFilterChange} />

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
            <IssueGraph
              issues={issues}
              dependencies={dependencies}
              onNodeClick={setSelectedIssueId}
              onEdgeDelete={handleEdgeDelete}
            />
          )}
        </div>

        <IssueDetail
          issue={selectedIssue}
          onClose={() => setSelectedIssueId(null)}
          onAddSubIssue={mutations.addSubIssue}
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
  placeholder: {
    color: "#656d76",
    fontSize: 14,
  },
  error: {
    color: "#cf222e",
    fontSize: 14,
  },
};
