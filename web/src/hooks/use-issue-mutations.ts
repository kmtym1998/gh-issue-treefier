import { useCallback, useState } from "react";
import { restDelete, restGet, restPost } from "../api-client";

interface GitHubIssue {
  id: number;
}

/**
 * Issue 番号から REST API の issue ID を取得する。
 */
async function fetchIssueId(
  owner: string,
  repo: string,
  number: number,
): Promise<number> {
  const issue = await restGet<GitHubIssue>(
    `repos/${owner}/${repo}/issues/${number}`,
  );
  return issue.id;
}

/**
 * Sub-Issue を追加する。
 * POST /repos/{owner}/{repo}/issues/{parent_number}/sub_issues
 */
export async function addSubIssue(
  owner: string,
  repo: string,
  parentNumber: number,
  childNumber: number,
): Promise<void> {
  const childId = await fetchIssueId(owner, repo, childNumber);
  await restPost(`repos/${owner}/${repo}/issues/${parentNumber}/sub_issues`, {
    sub_issue_id: childId,
  });
}

/**
 * Sub-Issue を削除する。
 * DELETE /repos/{owner}/{repo}/issues/{parent_number}/sub_issues/{sub_issue_id}
 */
export async function removeSubIssue(
  owner: string,
  repo: string,
  parentNumber: number,
  childNumber: number,
): Promise<void> {
  const childId = await fetchIssueId(owner, repo, childNumber);
  await restDelete(
    `repos/${owner}/${repo}/issues/${parentNumber}/sub_issues/${childId}`,
  );
}

export interface UseIssueMutationsResult {
  addSubIssue: (
    owner: string,
    repo: string,
    parentNumber: number,
    childNumber: number,
  ) => Promise<void>;
  removeSubIssue: (
    owner: string,
    repo: string,
    parentNumber: number,
    childNumber: number,
  ) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

/**
 * 依存関係の追加・削除を行うフック。
 * onSuccess が渡された場合、操作成功後に呼び出す（データの再取得用）。
 */
export function useIssueMutations(
  onSuccess?: () => void,
): UseIssueMutationsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wrap = useCallback(
    async (fn: () => Promise<void>) => {
      setLoading(true);
      setError(null);
      try {
        await fn();
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess],
  );

  const add = useCallback(
    (owner: string, repo: string, parentNumber: number, childNumber: number) =>
      wrap(() => addSubIssue(owner, repo, parentNumber, childNumber)),
    [wrap],
  );

  const remove = useCallback(
    (owner: string, repo: string, parentNumber: number, childNumber: number) =>
      wrap(() => removeSubIssue(owner, repo, parentNumber, childNumber)),
    [wrap],
  );

  return { addSubIssue: add, removeSubIssue: remove, loading, error };
}
