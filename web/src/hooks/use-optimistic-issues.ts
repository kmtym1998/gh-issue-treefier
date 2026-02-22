import { useCallback, useEffect, useMemo, useState } from "react";
import type { Issue } from "../types/issue";

export interface UseOptimisticIssuesResult {
  /** サーバーデータ + 楽観的 Issue のマージ済みリスト */
  allIssues: Issue[];
  /** 楽観的に Issue を追加する */
  addOptimisticIssue: (issue: Issue) => void;
}

/**
 * サーバーから取得した Issue リストに、楽観的に追加した Issue をマージする。
 * サーバーデータに反映されたらクリーンアップする。
 */
export const useOptimisticIssues = (
  serverIssues: Issue[],
): UseOptimisticIssuesResult => {
  const [optimisticIssues, setOptimisticIssues] = useState<Issue[]>([]);

  // サーバーデータに含まれるようになった楽観的 Issue をクリア
  useEffect(() => {
    if (optimisticIssues.length === 0) return;
    const realIds = new Set(serverIssues.map((i) => i.id));
    const stillPending = optimisticIssues.filter((i) => !realIds.has(i.id));
    if (stillPending.length !== optimisticIssues.length) {
      setOptimisticIssues(stillPending);
    }
  }, [serverIssues, optimisticIssues]);

  const allIssues = useMemo(() => {
    const realIds = new Set(serverIssues.map((i) => i.id));
    const remaining = optimisticIssues.filter((i) => !realIds.has(i.id));
    return [...serverIssues, ...remaining];
  }, [serverIssues, optimisticIssues]);

  const addOptimisticIssue = useCallback((issue: Issue) => {
    setOptimisticIssues((prev) => [...prev, issue]);
  }, []);

  return { allIssues, addOptimisticIssue };
};
