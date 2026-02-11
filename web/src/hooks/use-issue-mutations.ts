import { useCallback, useState } from "react";
import { graphql, restGet, restPost } from "../api-client";

interface GitHubIssue {
  id: number;
  node_id: string;
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
 * Issue 番号から GraphQL 用の node_id を取得する。
 */
async function fetchIssueNodeId(
  owner: string,
  repo: string,
  number: number,
): Promise<string> {
  const issue = await restGet<GitHubIssue>(
    `repos/${owner}/${repo}/issues/${number}`,
  );
  return issue.node_id;
}

const ADD_BLOCKED_BY_MUTATION = `
  mutation($issueId: ID!, $blockedByIssueId: ID!) {
    addBlockedBy(input: { issueId: $issueId, blockedByIssueId: $blockedByIssueId }) {
      issue { id }
    }
  }
`;

const REMOVE_BLOCKED_BY_MUTATION = `
  mutation($issueId: ID!, $blockedByIssueId: ID!) {
    removeBlockedBy(input: { issueId: $issueId, blockedByIssueId: $blockedByIssueId }) {
      issue { id }
    }
  }
`;

const REMOVE_SUB_ISSUE_MUTATION = `
  mutation($issueId: ID!, $subIssueId: ID!) {
    removeSubIssue(input: { issueId: $issueId, subIssueId: $subIssueId }) {
      issue { id }
    }
  }
`;

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
  const [issueNodeId, subIssueNodeId] = await Promise.all([
    fetchIssueNodeId(owner, repo, parentNumber),
    fetchIssueNodeId(owner, repo, childNumber),
  ]);
  await graphql(REMOVE_SUB_ISSUE_MUTATION, {
    issueId: issueNodeId,
    subIssueId: subIssueNodeId,
  });
}

/**
 * BlockedBy 関係を追加する。
 * issueNumber がブロックされている側、blockerNumber がブロックしている側。
 */
export async function addBlockedBy(
  owner: string,
  repo: string,
  issueNumber: number,
  blockerNumber: number,
): Promise<void> {
  const [issueNodeId, blockerNodeId] = await Promise.all([
    fetchIssueNodeId(owner, repo, issueNumber),
    fetchIssueNodeId(owner, repo, blockerNumber),
  ]);
  await graphql(ADD_BLOCKED_BY_MUTATION, {
    issueId: issueNodeId,
    blockedByIssueId: blockerNodeId,
  });
}

/**
 * BlockedBy 関係を削除する。
 * issueNumber がブロックされている側、blockerNumber がブロックしている側。
 */
export async function removeBlockedBy(
  owner: string,
  repo: string,
  issueNumber: number,
  blockerNumber: number,
): Promise<void> {
  const [issueNodeId, blockerNodeId] = await Promise.all([
    fetchIssueNodeId(owner, repo, issueNumber),
    fetchIssueNodeId(owner, repo, blockerNumber),
  ]);
  await graphql(REMOVE_BLOCKED_BY_MUTATION, {
    issueId: issueNodeId,
    blockedByIssueId: blockerNodeId,
  });
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
  addBlockedBy: (
    owner: string,
    repo: string,
    issueNumber: number,
    blockerNumber: number,
  ) => Promise<void>;
  removeBlockedBy: (
    owner: string,
    repo: string,
    issueNumber: number,
    blockerNumber: number,
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

  const addBlocked = useCallback(
    (owner: string, repo: string, issueNumber: number, blockerNumber: number) =>
      wrap(() => addBlockedBy(owner, repo, issueNumber, blockerNumber)),
    [wrap],
  );

  const removeBlocked = useCallback(
    (owner: string, repo: string, issueNumber: number, blockerNumber: number) =>
      wrap(() => removeBlockedBy(owner, repo, issueNumber, blockerNumber)),
    [wrap],
  );

  return {
    addSubIssue: add,
    removeSubIssue: remove,
    addBlockedBy: addBlocked,
    removeBlockedBy: removeBlocked,
    loading,
    error,
  };
}
