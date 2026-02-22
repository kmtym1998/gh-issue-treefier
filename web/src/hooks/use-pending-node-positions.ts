import { useCallback, useEffect, useRef, useState } from "react";
import { getNodePositions, setNodePositions } from "../lib/cache";
import type { Issue } from "../types/issue";

export interface UsePendingNodePositionsResult {
  /** ReactFlow ノードに渡す位置マップ */
  pendingNodePositions: Record<string, { x: number; y: number }>;
  /**
   * 次に開くパネル（create / search）の起点位置を予約する。
   * allIssues に新しいIDが現れたとき、この位置が自動的に割り当てられる。
   */
  reservePosition: (pos: { x: number; y: number }) => void;
  /**
   * 特定の Issue ID に対して即座に位置を割り当てる。
   * 楽観的 Issue 追加のように、ID が事前にわかっている場合に使う。
   */
  assignPosition: (issueId: string, pos: { x: number; y: number }) => void;
  /**
   * 予約済みの位置を指定 Issue ID に割り当てる。
   * reservePosition で設定した位置を消費する。予約がない場合は何もしない。
   */
  assignReservedPosition: (issueId: string) => void;
  /** 予約済み位置をクリアする（パネルをキャンセルした場合など） */
  clearReservedPosition: () => void;
}

/**
 * 新規追加ノードの位置管理を担うフック。
 *
 * 2つのパスで位置を割り当てる:
 * 1. reservePosition → allIssues に新 ID が出現したら自動割り当て（search form 用）
 * 2. assignPosition → ID を指定して即座に割り当て（create form 用）
 */
export const usePendingNodePositions = (
  projectId: string,
  allIssues: Issue[],
): UsePendingNodePositionsResult => {
  const [pendingNodePositions, setPendingNodePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const reservedPositionRef = useRef<{ x: number; y: number } | null>(null);
  const prevIssueIdsRef = useRef(new Set<string>());

  // allIssues に新 ID が追加されたとき、reservedPosition が設定されていれば割り当てる
  useEffect(() => {
    const currentIds = new Set(allIssues.map((i) => i.id));
    const reserved = reservedPositionRef.current;

    if (reserved && prevIssueIdsRef.current.size > 0) {
      const newIds = [...currentIds].filter(
        (id) => !prevIssueIdsRef.current.has(id),
      );
      if (newIds.length > 0) {
        applyPositions(newIds, reserved, projectId, setPendingNodePositions);
        reservedPositionRef.current = null;
      }
    }

    prevIssueIdsRef.current = currentIds;
  }, [allIssues, projectId]);

  const reservePosition = useCallback((pos: { x: number; y: number }) => {
    reservedPositionRef.current = pos;
  }, []);

  const assignPosition = useCallback(
    (issueId: string, pos: { x: number; y: number }) => {
      applyPositions([issueId], pos, projectId, setPendingNodePositions);
      reservedPositionRef.current = null;
    },
    [projectId],
  );

  const assignReservedPosition = useCallback(
    (issueId: string) => {
      const pos = reservedPositionRef.current;
      if (!pos) return;
      applyPositions([issueId], pos, projectId, setPendingNodePositions);
      reservedPositionRef.current = null;
    },
    [projectId],
  );

  const clearReservedPosition = useCallback(() => {
    reservedPositionRef.current = null;
  }, []);

  return {
    pendingNodePositions,
    reservePosition,
    assignPosition,
    assignReservedPosition,
    clearReservedPosition,
  };
};

/** 指定 ID 群に位置を設定し、IndexedDB キャッシュにも保存する */
function applyPositions(
  issueIds: string[],
  pos: { x: number; y: number },
  projectId: string,
  setPendingNodePositions: React.Dispatch<
    React.SetStateAction<Record<string, { x: number; y: number }>>
  >,
) {
  setPendingNodePositions((prev) => {
    const next = { ...prev };
    for (const id of issueIds) {
      next[id] = pos;
    }
    return next;
  });
  getNodePositions(projectId).then((saved) => {
    const positions = { ...(saved?.positions ?? {}) };
    for (const id of issueIds) {
      positions[id] = pos;
    }
    setNodePositions(projectId, positions);
  });
}
