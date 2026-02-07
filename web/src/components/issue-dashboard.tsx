import { useCallback, useMemo, useState } from "react";
import { useIssues } from "../hooks/use-issues";
import { FilterPanel, type FilterValues } from "./filter-panel";
import { IssueDetail } from "./issue-detail";
import { IssueGraph } from "./issue-graph";

function getQueryParams(): Partial<FilterValues> {
  const params = new URLSearchParams(window.location.search);
  const result: Partial<FilterValues> = {};
  const owner = params.get("owner");
  const repo = params.get("repo");
  if (owner) result.owner = owner;
  if (repo) result.repo = repo;
  return result;
}

export function IssueDashboard() {
  const queryParams = useMemo(() => getQueryParams(), []);

  const [filters, setFilters] = useState<FilterValues>({
    owner: "",
    repo: "",
    state: "open",
    projectId: "",
    fieldFilters: {},
    ...queryParams,
  });
  const [selectedIssueNumber, setSelectedIssueNumber] = useState<number | null>(
    null,
  );

  const handleFilterChange = useCallback((next: FilterValues) => {
    setFilters(next);
    setSelectedIssueNumber(null);
  }, []);

  const { issues, dependencies, loading, error } = useIssues({
    owner: filters.owner,
    repo: filters.repo,
    state: filters.state,
  });

  const selectedIssue = useMemo(
    () => issues.find((i) => i.number === selectedIssueNumber) ?? null,
    [issues, selectedIssueNumber],
  );

  const hasQuery = filters.owner !== "" && filters.repo !== "";

  return (
    <div style={styles.root}>
      <FilterPanel defaultValues={queryParams} onChange={handleFilterChange} />

      <div style={styles.main}>
        <div style={styles.graphArea}>
          {!hasQuery && (
            <p style={styles.placeholder}>
              Owner と Repo を入力して Issue を表示
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
              onNodeClick={setSelectedIssueNumber}
            />
          )}
        </div>

        <IssueDetail
          issue={selectedIssue}
          onClose={() => setSelectedIssueNumber(null)}
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
