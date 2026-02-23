import {
  Button,
  Checkbox,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Background,
  type Connection,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// TODO: issue-graph.tsx が getNodePositions/setNodePositions を直接操作している。
// usePendingNodePositions フックと同じキャッシュを独立して操作しているため、
// 将来整合性が崩れるリスクがある。キャッシュ操作をフック経由に統一すべき。
import { getNodePositions, setNodePositions } from "../lib/cache";
import type {
  Dependency,
  DependencyType,
  Issue,
  PaneContextMenuState,
} from "../types/issue";
import type { ProjectField } from "../types/project";
import { PaneContextMenu } from "./pane-context-menu";

import "@xyflow/react/dist/style.css";

interface ResolvedField {
  name: string;
  value: string;
  /** GitHub ProjectV2SingleSelectFieldOption の color enum 値 */
  color?: string;
}

/** GitHub の SINGLE_SELECT オプション color enum → CSS カラー */
const FIELD_OPTION_COLORS: Record<string, { bg: string; text: string }> = {
  GRAY: { bg: "#eaeef2", text: "#57606a" },
  BLUE: { bg: "#ddf4ff", text: "#0550ae" },
  GREEN: { bg: "#dafbe1", text: "#116329" },
  YELLOW: { bg: "#fff8c5", text: "#9a6700" },
  ORANGE: { bg: "#fff1e5", text: "#953800" },
  RED: { bg: "#ffebe9", text: "#cf222e" },
  PINK: { bg: "#ffeff7", text: "#bf3989" },
  PURPLE: { bg: "#fbefff", text: "#8250df" },
  CYAN: { bg: "#e6f4f1", text: "#0d7a6b" },
};

interface IssueNodeData {
  issue: Issue;
  isMultiRepo: boolean;
  resolvedFields: ResolvedField[];
}

const IssueNode = ({ data, selected }: NodeProps) => {
  const { issue, isMultiRepo, resolvedFields } =
    data as unknown as IssueNodeData;
  const isPR = issue.url.includes("/pull/");
  const isOpen = issue.state === "open";
  const stateColor = isOpen ? "#1a7f37" : "#8250df";
  const stateBg = isOpen ? "#dafbe1" : "#f0e6ff";

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${selected ? "#0969da" : "#d0d7de"}`,
        borderLeft: `3px solid ${stateColor}`,
        borderRadius: 6,
        padding: "6px 8px 5px",
        fontSize: 12,
        width: NODE_WIDTH,
        boxSizing: "border-box",
        boxShadow: selected
          ? "0 0 0 2px #0969da40"
          : "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <Handle type="target" position={Position.Top} />

      {/* ヘッダー: タイプ + リポジトリ + 番号 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 3,
          gap: 4,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 4px",
              borderRadius: 3,
              background: isPR ? "#ddf4ff" : stateBg,
              color: isPR ? "#0550ae" : stateColor,
              letterSpacing: "0.03em",
              flexShrink: 0,
            }}
          >
            {isPR ? "PR" : "Issue"}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#656d76",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {isMultiRepo ? `${issue.owner}/${issue.repo}` : issue.repo}
          </span>
        </div>
        <span style={{ fontSize: 10, color: "#656d76", flexShrink: 0 }}>
          #{issue.number}
        </span>
      </div>

      {/* タイトル */}
      <div
        style={{
          fontWeight: 500,
          fontSize: 12,
          color: "#24292f",
          lineHeight: 1.35,
          marginBottom:
            resolvedFields.length > 0 || issue.assignees.length > 0 ? 5 : 0,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {issue.title}
      </div>

      {/* フッター: ステータス + フィールド値 + Assignee */}
      {(resolvedFields.length > 0 || issue.assignees.length > 0) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{ display: "flex", gap: 3, flexWrap: "wrap", minWidth: 0 }}
          >
            {resolvedFields.map((f) => {
              const fieldColor = f.color
                ? FIELD_OPTION_COLORS[f.color]
                : undefined;
              return (
                <span
                  key={f.name}
                  style={{
                    fontSize: 10,
                    padding: "1px 5px",
                    borderRadius: 10,
                    background: fieldColor?.bg ?? "#f6f8fa",
                    color: fieldColor?.text ?? "#57606a",
                    border: `1px solid ${fieldColor?.bg ?? "#d0d7de"}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.value}
                </span>
              );
            })}
          </div>
          {issue.assignees.length > 0 && (
            <div style={{ display: "flex", gap: -2, flexShrink: 0 }}>
              {issue.assignees.slice(0, 4).map((a) => (
                <img
                  key={a.login}
                  src={a.avatarUrl}
                  alt={a.login}
                  title={a.login}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "1px solid #fff",
                    marginLeft: -3,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const nodeTypes = { issue: IssueNode };

const NODE_WIDTH = 240;
export const NODE_HEIGHT = 88;

/**
 * Issue 配列を ReactFlow の Node 配列に変換する。
 * position は仮の値（0, 0）で、layoutNodes で更新される。
 * projectFields・visibleFieldIds を渡すとフィールド値をノードデータに含める。
 */
export const issuesToNodes = (
  issues: Issue[],
  projectFields: ProjectField[] = [],
  visibleFieldIds: string[] = [],
): Node[] => {
  const repos = new Set(issues.map((i) => `${i.owner}/${i.repo}`));
  const isMultiRepo = repos.size > 1;

  return issues.map((issue) => {
    const resolvedFields: ResolvedField[] = visibleFieldIds.flatMap(
      (fieldId) => {
        const field = projectFields.find((f) => f.id === fieldId);
        if (!field) return [];
        const optionId = issue.fieldValues?.[fieldId];
        if (!optionId) return [];
        const option = field.options.find((o) => o.id === optionId);
        if (!option) return [];
        return [{ name: field.name, value: option.name, color: option.color }];
      },
    );

    return {
      id: issue.id,
      type: "issue",
      data: { issue, isMultiRepo, resolvedFields } satisfies IssueNodeData,
      position: { x: 0, y: 0 },
    };
  });
};

/**
 * Dependency 配列を ReactFlow の Edge 配列に変換する。
 * エッジの種類に応じてスタイルを分岐する。
 */
export const dependenciesToEdges = (dependencies: Dependency[]): Edge[] => {
  return dependencies.map((dep) => {
    const base = {
      id: `e:${dep.type}:${dep.source}-${dep.target}`,
      source: dep.source,
      target: dep.target,
      animated: false,
      data: { type: dep.type },
    };

    if (dep.type === "blocked_by") {
      return {
        ...base,
        style: { stroke: "#cf222e", strokeDasharray: "5 3" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#cf222e" },
      };
    }

    return {
      ...base,
      style: { stroke: "#656d76" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#656d76" },
    };
  });
};

/**
 * 指定ノードから outgoing エッジを辿り、子孫ノードの ID を全て返す（再帰）。
 * sub_issue と blocked_by の両方のエッジを辿る。
 */
export const getDescendantIds = (nodeId: string, edges: Edge[]): Set<string> => {
  const result = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined) break;
    for (const edge of edges) {
      if (edge.source === current && !result.has(edge.target)) {
        result.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return result;
};

/**
 * 指定ノードから incoming エッジを辿り、祖先ノードの ID を全て返す（再帰）。
 * sub_issue と blocked_by の両方のエッジを辿る。
 */
export const getAncestorIds = (nodeId: string, edges: Edge[]): Set<string> => {
  const result = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined) break;
    for (const edge of edges) {
      if (edge.target === current && !result.has(edge.source)) {
        result.add(edge.source);
        queue.push(edge.source);
      }
    }
  }
  return result;
};

const elk = new ELK();

/**
 * ELKjs を使って Node 配列にレイアウト座標を付与する。
 * 元の配列は変更せず、新しい配列を返す。
 */
export const layoutNodes = async (
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
): Promise<Node[]> => {
  if (nodes.length === 0) return [];

  const isHorizontal = direction === "LR";

  // ELK は存在しないノードへのエッジ参照をエラーにするため、
  // 両端のノードが存在するエッジのみを渡す
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": isHorizontal ? "RIGHT" : "DOWN",
      "elk.spacing.nodeNode": "30",
      "elk.layered.spacing.nodeNodeBetweenLayers": "320",
      "elk.layered.wrapping.strategy": "MULTI_EDGE",
      "elk.aspectRatio": "1.0",
      "elk.layered.wrapping.correctionFactor": "1.0",
      "elk.layered.compaction.postCompaction.strategy": "EDGE_LENGTH",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: validEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layouted = await elk.layout(graph);

  const posMap = new Map<string, { x: number; y: number }>();
  for (const child of layouted.children ?? []) {
    posMap.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }

  return nodes.map((node) => {
    const pos = posMap.get(node.id) ?? { x: 0, y: 0 };
    return {
      ...node,
      targetPosition: (isHorizontal ? "left" : "top") as Position,
      sourcePosition: (isHorizontal ? "right" : "bottom") as Position,
      position: { x: pos.x, y: pos.y },
    };
  });
};

export interface IssueGraphProps {
  issues: Issue[];
  dependencies: Dependency[];
  projectId: string;
  projectFields?: ProjectField[];
  pendingNodePositions?: Record<string, { x: number; y: number }>;
  onNodeClick?: (issueId: string | null) => void;
  onEdgeDelete?: (source: string, target: string, type: DependencyType) => void;
  onEdgeAdd?: (source: string, target: string, type: DependencyType) => void;
  onCreateIssue?: (flowPosition: { x: number; y: number }) => void;
  onAddIssue?: (flowPosition: { x: number; y: number }) => void;
  onAddPR?: (flowPosition: { x: number; y: number }) => void;
  onEditIssue?: (issue: Issue) => void;
  onDeleteIssue?: (issue: Issue) => void;
}

export const IssueGraph = (props: IssueGraphProps) => {
  return <IssueGraphInner {...props} />;
};

const IssueGraphInner = ({
  issues,
  dependencies,
  projectId,
  projectFields = [],
  pendingNodePositions,
  onNodeClick,
  onEdgeDelete,
  onEdgeAdd,
  onCreateIssue,
  onAddIssue,
  onAddPR,
  onEditIssue,
  onDeleteIssue,
}: IssueGraphProps) => {
  const [layoutedNodes, setLayoutedNodes] = useState<Node[] | null>(null);

  const initializedProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId || issues.length === 0) return;
    if (initializedProjectIdRef.current === projectId && layoutedNodes) return;

    let cancelled = false;
    const nodes = issuesToNodes(issues); // レイアウト用: フィールド値不要
    const edges = dependenciesToEdges(dependencies);

    layoutNodes(nodes, edges).then(async (result) => {
      if (cancelled) return;
      const saved = await getNodePositions(projectId);
      if (cancelled) return;
      if (saved) {
        const restored = result.map((node) => {
          const pos = saved.positions[node.id];
          return pos ? { ...node, position: pos } : node;
        });
        setLayoutedNodes(restored);
      } else {
        setLayoutedNodes(result);
      }
      initializedProjectIdRef.current = projectId;
    });

    return () => {
      cancelled = true;
    };
  }, [issues, dependencies, projectId, layoutedNodes]);

  // エッジは dependencies から純粋に導出
  const edges = useMemo(
    () => dependenciesToEdges(dependencies),
    [dependencies],
  );

  if (!layoutedNodes) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#656d76",
          fontSize: 14,
        }}
      >
        Loading layout…
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <IssueGraphReady
        projectId={projectId}
        initialNodes={layoutedNodes}
        issues={issues}
        edges={edges}
        projectFields={projectFields}
        pendingNodePositions={pendingNodePositions}
        onNodeClick={onNodeClick}
        onEdgeDelete={onEdgeDelete}
        onEdgeAdd={onEdgeAdd}
        onCreateIssue={onCreateIssue}
        onAddIssue={onAddIssue}
        onAddPR={onAddPR}
        onEditIssue={onEditIssue}
        onDeleteIssue={onDeleteIssue}
      />
    </ReactFlowProvider>
  );
};

const IssueGraphReady = ({
  projectId,
  initialNodes,
  issues,
  edges,
  projectFields,
  pendingNodePositions,
  onNodeClick,
  onEdgeDelete,
  onEdgeAdd,
  onCreateIssue,
  onAddIssue,
  onAddPR,
  onEditIssue,
  onDeleteIssue,
}: {
  projectId: string;
  initialNodes: Node[];
  issues: Issue[];
  edges: Edge[];
  projectFields: ProjectField[];
  pendingNodePositions?: Record<string, { x: number; y: number }>;
  onNodeClick?: (issueId: string | null) => void;
  onEdgeDelete?: (source: string, target: string, type: DependencyType) => void;
  onEdgeAdd?: (source: string, target: string, type: DependencyType) => void;
  onCreateIssue?: (flowPosition: { x: number; y: number }) => void;
  onAddIssue?: (flowPosition: { x: number; y: number }) => void;
  onAddPR?: (flowPosition: { x: number; y: number }) => void;
  onEditIssue?: (issue: Issue) => void;
  onDeleteIssue?: (issue: Issue) => void;
}) => {
  const selectableFields = projectFields.filter(
    (f) => f.dataType === "SINGLE_SELECT" || f.dataType === "ITERATION",
  );

  const [visibleFieldIds, setVisibleFieldIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("node-visible-fields");
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [fieldsMenuAnchorEl, setFieldsMenuAnchorEl] =
    useState<HTMLButtonElement | null>(null);
  const fieldsMenuOpen = Boolean(fieldsMenuAnchorEl);

  const toggleFieldVisibility = useCallback((fieldId: string) => {
    setVisibleFieldIds((prev) => {
      const next = prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId];
      localStorage.setItem("node-visible-fields", JSON.stringify(next));
      return next;
    });
  }, []);

  const [connectionMode, setConnectionMode] =
    useState<DependencyType>("sub_issue");

  const [nodes, setNodes, onNodesChangeOriginal] = useNodesState(initialNodes);
  const prevProjectIdRef = useRef(projectId);

  useEffect(() => {
    if (prevProjectIdRef.current === projectId) return;
    prevProjectIdRef.current = projectId;
    setNodes(initialNodes);
  }, [projectId, initialNodes, setNodes]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const onNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChangeOriginal>[0]) => {
      onNodesChangeOriginal(changes);

      const hasDragEnd = changes.some(
        (c) => c.type === "position" && c.dragging === false,
      );
      if (!hasDragEnd) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const positions: Record<string, { x: number; y: number }> = {};
        for (const node of nodesRef.current) {
          positions[node.id] = { x: node.position.x, y: node.position.y };
        }
        setNodePositions(projectId, positions);
      }, 500);
    },
    [onNodesChangeOriginal, projectId],
  );

  const [selectedCount, setSelectedCount] = useState(0);

  const handleSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      setSelectedCount(selected.length);
      if (selected.length === 1) {
        onNodeClick?.(selected[0].id);
      } else {
        onNodeClick?.(null);
      }
    },
    [onNodeClick],
  );

  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    let cancelled = false;
    const issueNodes = issuesToNodes(issues, projectFields, visibleFieldIds);
    const issueNodeMap = new Map(issueNodes.map((node) => [node.id, node]));

    const apply = async () => {
      const saved = await getNodePositions(projectId);
      if (cancelled) return;
      const savedPositions = saved?.positions ?? {};

      setNodes((prev) => {
        const next: Node[] = [];
        const existingIds = new Set<string>();

        for (const node of prev) {
          const issueNode = issueNodeMap.get(node.id);
          if (!issueNode) continue;
          existingIds.add(node.id);
          next.push({
            ...node,
            type: issueNode.type,
            data: issueNode.data,
          });
        }

        for (const node of issueNodes) {
          if (existingIds.has(node.id)) continue;
          const pendingPos = pendingNodePositions?.[node.id];
          const savedPos = savedPositions[node.id];
          const position = pendingPos ?? savedPos;
          next.push(position ? { ...node, position } : node);
        }

        return next;
      });
    };

    apply();
    return () => {
      cancelled = true;
    };
  }, [
    issues,
    pendingNodePositions,
    projectId,
    projectFields,
    visibleFieldIds,
    setNodes,
  ]);

  // --- ペインコンテキストメニュー（空白領域の右クリック） ---
  const [paneContextMenu, setPaneContextMenu] =
    useState<PaneContextMenuState | null>(null);

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setPaneContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition],
  );

  const closePaneContextMenu = useCallback(() => setPaneContextMenu(null), []);

  // --- コンテキストメニュー ---
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    issue: Issue;
    x: number;
    y: number;
  } | null>(null);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const issue = issues.find((i) => i.id === node.id);
      if (!issue) return;
      setContextMenu({
        nodeId: node.id,
        issue,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [issues],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handlePaneClick = useCallback(() => {
    closeContextMenu();
    closePaneContextMenu();
  }, [closeContextMenu, closePaneContextMenu]);

  const handleSelectDescendants = useCallback(() => {
    if (!contextMenu) return;
    const ids = getDescendantIds(contextMenu.nodeId, edges);
    ids.add(contextMenu.nodeId);
    setNodes((prev) => prev.map((n) => ({ ...n, selected: ids.has(n.id) })));
    setContextMenu(null);
  }, [contextMenu, edges, setNodes]);

  const handleSelectAncestors = useCallback(() => {
    if (!contextMenu) return;
    const ids = getAncestorIds(contextMenu.nodeId, edges);
    ids.add(contextMenu.nodeId);
    setNodes((prev) => prev.map((n) => ({ ...n, selected: ids.has(n.id) })));
    setContextMenu(null);
  }, [contextMenu, edges, setNodes]);

  const handleLayoutSelected = useCallback(async () => {
    if (!contextMenu) return;
    setContextMenu(null);

    // 選択中ノードが2つ以上あり、右クリックしたノードが選択に含まれていれば
    // 選択ノード群を対象にする。それ以外は右クリックノード＋子孫を対象にする。
    const selectedNodes = nodes.filter((n) => n.selected);
    const isClickedNodeSelected = selectedNodes.some(
      (n) => n.id === contextMenu.nodeId,
    );
    let targetIds: Set<string>;
    if (selectedNodes.length >= 2 && isClickedNodeSelected) {
      targetIds = new Set(selectedNodes.map((n) => n.id));
    } else {
      targetIds = getDescendantIds(contextMenu.nodeId, edges);
      targetIds.add(contextMenu.nodeId);
    }

    const targetNodes = nodes.filter((n) => targetIds.has(n.id));
    if (targetNodes.length < 2) return;

    const subEdges = edges.filter(
      (e) => targetIds.has(e.source) && targetIds.has(e.target),
    );

    // 元の左上を基準オフセットとして保持
    const originX = Math.min(...targetNodes.map((n) => n.position.x));
    const originY = Math.min(...targetNodes.map((n) => n.position.y));

    const layouted = await layoutNodes(targetNodes, subEdges);

    const posMap = new Map(layouted.map((n) => [n.id, n.position]));
    setNodes((prev) =>
      prev.map((n) => {
        const newPos = posMap.get(n.id);
        if (!newPos) return n;
        return {
          ...n,
          position: { x: newPos.x + originX, y: newPos.y + originY },
        };
      }),
    );
  }, [contextMenu, nodes, edges, setNodes]);

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (!onEdgeDelete) return;
      const edgeType = (edge.data?.type as DependencyType) ?? "sub_issue";
      const label =
        edgeType === "blocked_by"
          ? "Remove blocked-by link"
          : "Remove sub-issue link";
      if (window.confirm(`${label}: ${edge.source} → ${edge.target}?`))
        onEdgeDelete(edge.source, edge.target, edgeType);
    },
    [onEdgeDelete],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      onEdgeAdd?.(connection.source, connection.target, connectionMode);
    },
    [onEdgeAdd, connectionMode],
  );

  const connectionLineStyle =
    connectionMode === "blocked_by"
      ? { stroke: "#cf222e", strokeDasharray: "5 3" }
      : { stroke: "#656d76" };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div style={graphStyles.modeBar}>
        <button
          type="button"
          style={{
            ...graphStyles.modeButton,
            ...(connectionMode === "sub_issue"
              ? graphStyles.modeButtonActiveSubIssue
              : {}),
          }}
          onClick={() => setConnectionMode("sub_issue")}
        >
          Sub-Issue
        </button>
        <button
          type="button"
          style={{
            ...graphStyles.modeButton,
            ...(connectionMode === "blocked_by"
              ? graphStyles.modeButtonActiveBlockedBy
              : {}),
          }}
          onClick={() => setConnectionMode("blocked_by")}
        >
          Blocked By
        </button>

        {selectableFields.length > 0 && (
          <div style={{ marginLeft: 8 }}>
            <Button
              size="small"
              variant="text"
              onClick={(e) => setFieldsMenuAnchorEl(e.currentTarget)}
              sx={{ fontSize: 12, py: "3px" }}
            >
              プロジェクトフィールドの表示
              {visibleFieldIds.length > 0 ? ` (${visibleFieldIds.length})` : ""}
            </Button>
            <Menu
              open={fieldsMenuOpen}
              anchorEl={fieldsMenuAnchorEl}
              onClose={() => setFieldsMenuAnchorEl(null)}
              slotProps={{ list: { dense: true } }}
            >
              {selectableFields.map((field) => (
                <MenuItem
                  key={field.id}
                  onClick={() => toggleFieldVisibility(field.id)}
                  sx={{ fontSize: 12 }}
                >
                  <Checkbox
                    checked={visibleFieldIds.includes(field.id)}
                    size="small"
                    sx={{ p: 0, mr: 1 }}
                  />
                  <ListItemText
                    primary={field.name}
                    slotProps={{ primary: { fontSize: 12 } }}
                  />
                </MenuItem>
              ))}
            </Menu>
          </div>
        )}
      </div>
      {selectedCount >= 2 && (
        <div style={graphStyles.selectionBadge}>
          {selectedCount} nodes selected
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onSelectionChange={handleSelectionChange}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onPaneClick={handlePaneClick}
        onEdgeClick={handleEdgeClick}
        onConnect={handleConnect}
        connectionLineStyle={connectionLineStyle}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        panOnScroll
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
      <PaneContextMenu
        open={paneContextMenu !== null}
        anchorPosition={paneContextMenu}
        onClose={closePaneContextMenu}
        onCreateIssue={() => {
          if (paneContextMenu)
            onCreateIssue?.({
              x: paneContextMenu.flowX,
              y: paneContextMenu.flowY,
            });
        }}
        onAddIssue={() => {
          if (paneContextMenu)
            onAddIssue?.({
              x: paneContextMenu.flowX,
              y: paneContextMenu.flowY,
            });
        }}
        onAddPR={() => {
          if (paneContextMenu)
            onAddPR?.({ x: paneContextMenu.flowX, y: paneContextMenu.flowY });
        }}
      />
      <Menu
        open={contextMenu !== null}
        onClose={closeContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined
        }
        slotProps={{ list: { dense: true, sx: { fontSize: 12 } } }}
      >
        <MenuItem
          sx={{ fontSize: 12 }}
          onClick={() => {
            if (contextMenu) window.open(contextMenu.issue.url, "_blank");
            closeContextMenu();
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            GitHub で表示
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
            </svg>
          </span>
        </MenuItem>
        {(onEditIssue || onDeleteIssue) && <Divider />}
        {onEditIssue && (
          <MenuItem
            sx={{ fontSize: 12 }}
            onClick={() => {
              if (contextMenu) onEditIssue(contextMenu.issue);
              closeContextMenu();
            }}
          >
            イシューを編集
          </MenuItem>
        )}
        {onDeleteIssue && (
          <MenuItem
            sx={{ fontSize: 12, color: "error.main" }}
            onClick={() => {
              if (contextMenu) onDeleteIssue(contextMenu.issue);
              closeContextMenu();
            }}
          >
            イシューを削除
          </MenuItem>
        )}
        <Divider />
        <MenuItem sx={{ fontSize: 12 }} onClick={handleSelectDescendants}>
          Select Descendants
        </MenuItem>
        <MenuItem sx={{ fontSize: 12 }} onClick={handleSelectAncestors}>
          Select Ancestors
        </MenuItem>
        <Divider />
        <MenuItem sx={{ fontSize: 12 }} onClick={handleLayoutSelected}>
          Layout Selected
        </MenuItem>
      </Menu>
    </div>
  );
};

const graphStyles: Record<string, React.CSSProperties> = {
  modeBar: {
    display: "flex",
    gap: 0,
    padding: "8px 12px",
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 10,
  },
  modeButton: {
    padding: "4px 12px",
    fontSize: 12,
    border: "1px solid #d0d7de",
    background: "#fff",
    cursor: "pointer",
    color: "#24292f",
  },
  modeButtonActiveSubIssue: {
    background: "#6e7781",
    color: "#fff",
    borderColor: "#6e7781",
  },
  selectionBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    padding: "4px 10px",
    fontSize: 12,
    background: "#0969da",
    color: "#fff",
    borderRadius: 12,
  },
  modeButtonActiveBlockedBy: {
    background: "#cf222e",
    color: "#fff",
    borderColor: "#cf222e",
  },
};
