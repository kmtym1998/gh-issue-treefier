import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { graphql } from "../api-client";
import { getCachedItems, setCachedItems } from "../lib/cache";
import type { GitHubProjectV2Item } from "../types/github";
import type { Dependency, Issue } from "../types/issue";

export interface UseProjectIssuesOptions {
  projectId: string;
  state?: "open" | "closed" | "all";
  fieldFilters?: Record<string, string>;
}

export interface UseProjectIssuesResult {
  issues: Issue[];
  dependencies: Dependency[];
  loading: boolean;
  isRevalidating: boolean;
  error: Error | null;
  refetch: () => void;
}

const PROJECT_ITEMS_QUERY = `
  query($projectId: ID!, $cursor: String) {
    node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            content {
              ... on Issue {
                number title state body url
                repository { owner { login } name }
                labels(first: 20) { nodes { name color } }
                assignees(first: 10) { nodes { login avatarUrl } }
                subIssues(first: 50) {
                  nodes { number repository { owner { login } name } }
                }
                blockedBy(first: 50) {
                  nodes { number repository { owner { login } name } }
                }
                blocking(first: 50) {
                  nodes { number repository { owner { login } name } }
                }
              }
            }
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue { field { ... on ProjectV2FieldCommon { id } } optionId }
                ... on ProjectV2ItemFieldIterationValue { field { ... on ProjectV2FieldCommon { id } } iterationId }
              }
            }
          }
        }
      }
    }
  }
`;

interface ProjectItemsGraphQLResponse {
  data: {
    node: {
      items: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: GitHubProjectV2Item[];
      };
    };
  };
}

/**
 * owner/repo#number 形式の複合 ID を生成する。
 */
export const buildIssueId = (
  owner: string,
  repo: string,
  number: number,
): string => `${owner}/${repo}#${number}`;

// TODO: buildIssueId の逆操作 parseIssueId をここに export する。
// 現在 issue-dashboard.tsx に useCallback でインライン定義されているが、
// 純粋関数なので useCallback は不要。buildIssueId の隣に置くのが自然。
// export const parseIssueId = (id: string) => {
//   const [ownerRepo, num] = id.split("#");
//   const [owner, repo] = ownerRepo.split("/");
//   return { owner, repo, number: Number.parseInt(num, 10) };
// };

/**
 * content が Issue のデータを持つか判定する。
 * GraphQL の `... on Issue` フラグメントは DraftIssue に対して空オブジェクト `{}` を返すため、
 * null チェックだけでは不十分。`number` プロパティの存在で判定する。
 */
const isIssueContent = (
  content: GitHubProjectV2Item["content"],
): content is NonNullable<GitHubProjectV2Item["content"]> =>
  content != null && "number" in content;

/**
 * GraphQL ProjectV2 Items から内部の Issue 型に変換する。
 * DraftIssue (content が空オブジェクトまたは null) は除外する。
 */
const parseProjectItems = (items: GitHubProjectV2Item[]): Issue[] =>
  items
    .filter(
      (
        item,
      ): item is GitHubProjectV2Item & {
        content: NonNullable<GitHubProjectV2Item["content"]>;
      } => isIssueContent(item.content),
    )
    .map((item) => {
      const c = item.content;
      const owner = c.repository.owner.login;
      const repo = c.repository.name;
      const fieldValues: Record<string, string> = {};
      for (const fv of item.fieldValues.nodes) {
        if (!fv.field?.id) continue;
        const value = fv.optionId ?? fv.iterationId;
        if (value) fieldValues[fv.field.id] = value;
      }
      return {
        id: buildIssueId(owner, repo, c.number),
        itemId: item.id,
        number: c.number,
        owner,
        repo,
        title: c.title,
        state: c.state.toLowerCase() as "open" | "closed",
        body: c.body ?? "",
        labels: c.labels.nodes.map((l) => ({ name: l.name, color: l.color })),
        assignees: c.assignees.nodes.map((a) => ({
          login: a.login,
          avatarUrl: a.avatarUrl,
        })),
        url: c.url,
        fieldValues,
      };
    });

/**
 * GraphQL ProjectV2 Items から subIssues / blockedBy / blocking を使って依存関係を構築する。
 * blockedBy / blocking は双方向からパースし、重複は Set で排除する。
 */
const parseProjectDependencies = (
  items: GitHubProjectV2Item[],
): Dependency[] => {
  const deps: Dependency[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!isIssueContent(item.content)) continue;
    const c = item.content;
    const currentOwner = c.repository.owner.login;
    const currentRepo = c.repository.name;
    const currentId = buildIssueId(currentOwner, currentRepo, c.number);

    // Sub-Issues: parent → child
    for (const sub of c.subIssues.nodes) {
      const childOwner = sub.repository.owner.login;
      const childRepo = sub.repository.name;
      const childId = buildIssueId(childOwner, childRepo, sub.number);
      deps.push({ source: currentId, target: childId, type: "sub_issue" });
    }

    // blockedBy: blocker(source) → blocked(target=current)
    for (const blocker of c.blockedBy.nodes) {
      const blockerOwner = blocker.repository.owner.login;
      const blockerRepo = blocker.repository.name;
      const blockerId = buildIssueId(blockerOwner, blockerRepo, blocker.number);
      const key = `blocked_by:${blockerId}-${currentId}`;
      if (!seen.has(key)) {
        seen.add(key);
        deps.push({
          source: blockerId,
          target: currentId,
          type: "blocked_by",
        });
      }
    }

    // blocking: current(source) → blocked(target)
    for (const blocked of c.blocking.nodes) {
      const blockedOwner = blocked.repository.owner.login;
      const blockedRepo = blocked.repository.name;
      const blockedId = buildIssueId(blockedOwner, blockedRepo, blocked.number);
      const key = `blocked_by:${currentId}-${blockedId}`;
      if (!seen.has(key)) {
        seen.add(key);
        deps.push({
          source: currentId,
          target: blockedId,
          type: "blocked_by",
        });
      }
    }
  }
  return deps;
};

/**
 * field フィルタに一致するか判定する。
 */
const matchesFieldFilters = (
  item: GitHubProjectV2Item,
  fieldFilters: Record<string, string>,
): boolean => {
  for (const [fieldId, value] of Object.entries(fieldFilters)) {
    if (!value) continue;
    const match = item.fieldValues.nodes.some(
      (fv) =>
        fv.field?.id === fieldId &&
        (fv.optionId === value || fv.iterationId === value),
    );
    if (!match) return false;
  }
  return true;
};

const fetchAllItems = async (
  projectId: string,
): Promise<GitHubProjectV2Item[]> => {
  const allItems: GitHubProjectV2Item[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const res: ProjectItemsGraphQLResponse =
      await graphql<ProjectItemsGraphQLResponse>(PROJECT_ITEMS_QUERY, {
        projectId,
        cursor,
      });
    const page = res.data.node.items;
    allItems.push(...page.nodes);
    cursor = page.pageInfo.endCursor;
    hasNextPage = page.pageInfo.hasNextPage;
  }

  return allItems;
};

export const useProjectIssues = (
  options: UseProjectIssuesOptions,
): UseProjectIssuesResult => {
  const [rawItems, setRawItems] = useState<GitHubProjectV2Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const forceRefetchRef = useRef(false);

  const refetch = useCallback(() => {
    forceRefetchRef.current = true;
    setRefetchKey((k) => k + 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetchKey is an intentional trigger for manual refetch
  useEffect(() => {
    if (!options.projectId) return;

    let cancelled = false;
    const forceRefetch = forceRefetchRef.current;
    forceRefetchRef.current = false;

    const fetchData = async () => {
      setError(null);

      try {
        // キャッシュからの読み込み（強制リフェッチ時はスキップ）
        if (!forceRefetch) {
          const cached = await getCachedItems(options.projectId);
          if (cached) {
            if (!cancelled) {
              setRawItems(cached.items);
              setIsRevalidating(true);
            }
          } else {
            if (!cancelled) setLoading(true);
          }
        } else {
          // refetch() は既にデータが表示されている状態で呼ばれるため、
          // loading ではなく isRevalidating を使ってグラフのアンマウントを防ぐ
          if (!cancelled) setIsRevalidating(true);
        }

        // API からフェッチ
        const items = await fetchAllItems(options.projectId);
        if (cancelled) return;

        setRawItems(items);
        await setCachedItems(options.projectId, items);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsRevalidating(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [options.projectId, refetchKey]);

  // フィルタ適用は useMemo で rawItems から導出
  const issues = useMemo(() => {
    const ff = options.fieldFilters;
    const filtered =
      ff && Object.keys(ff).length > 0
        ? rawItems.filter((item) => matchesFieldFilters(item, ff))
        : rawItems;

    let parsed = parseProjectItems(filtered);

    if (options.state && options.state !== "all") {
      parsed = parsed.filter((i) => i.state === options.state);
    }

    return parsed;
  }, [rawItems, options.state, options.fieldFilters]);

  // 依存関係は全 rawItems から導出
  const dependencies = useMemo(
    () => parseProjectDependencies(rawItems),
    [rawItems],
  );

  return { issues, dependencies, loading, isRevalidating, error, refetch };
};
