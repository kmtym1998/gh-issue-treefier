import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Issue } from "../types/issue";

export interface UseOptimisticIssuesResult {
  /** サーバーデータ + 楽観的 Issue のマージ済みリスト */
  allIssues: Issue[];
  /** 楽観的に Issue を追加する */
  addOptimisticIssue: (issue: Issue) => void;
  /** 楽観的に Issue を更新する（サーバーデータ更新まで即時反映） */
  updateOptimisticIssue: (issue: Issue) => void;
}

/**
 * サーバーから取得した Issue リストに、楽観的に追加・更新した Issue をマージする。
 * サーバーデータに反映されたらクリーンアップする。
 */
export const useOptimisticIssues = (
  serverIssues: Issue[],
): UseOptimisticIssuesResult => {
  const [optimisticIssues, setOptimisticIssues] = useState<Issue[]>([]);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Issue>>({});
  const prevServerRef = useRef(serverIssues);

  // サーバーデータに含まれるようになった楽観的 Issue をクリア
  useEffect(() => {
    if (optimisticIssues.length === 0) return;
    const realIds = new Set(serverIssues.map((i) => i.id));
    const stillPending = optimisticIssues.filter((i) => !realIds.has(i.id));
    if (stillPending.length !== optimisticIssues.length) {
      setOptimisticIssues(stillPending);
    }
  }, [serverIssues, optimisticIssues]);

  // サーバーデータが更新されたら楽観的更新をクリア
  useEffect(() => {
    if (prevServerRef.current === serverIssues) return;
    prevServerRef.current = serverIssues;
    if (Object.keys(optimisticUpdates).length > 0) {
      setOptimisticUpdates({});
    }
  }, [serverIssues, optimisticUpdates]);

  const allIssues = useMemo(() => {
    const realIds = new Set(serverIssues.map((i) => i.id));
    const remaining = optimisticIssues.filter((i) => !realIds.has(i.id));
    return [...serverIssues, ...remaining].map(
      (i) => optimisticUpdates[i.id] ?? i,
    );
  }, [serverIssues, optimisticIssues, optimisticUpdates]);

  const addOptimisticIssue = useCallback((issue: Issue) => {
    setOptimisticIssues((prev) => [...prev, issue]);
  }, []);

  const updateOptimisticIssue = useCallback((issue: Issue) => {
    setOptimisticUpdates((prev) => ({ ...prev, [issue.id]: issue }));
  }, []);

  return { allIssues, addOptimisticIssue, updateOptimisticIssue };
};
