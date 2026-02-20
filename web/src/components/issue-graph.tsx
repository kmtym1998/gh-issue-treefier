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
  SelectionMode,
  useNodesState,
} from "@xyflow/react";
import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getNodePositions, setNodePositions } from "../lib/cache";
import type { Dependency, DependencyType, Issue } from "../types/issue";

import "@xyflow/react/dist/style.css";

function IssueNode({ data, selected }: NodeProps) {
  const baseStyle = data.style as React.CSSProperties;
  const style: React.CSSProperties = selected
    ? {
        ...baseStyle,
        boxShadow: "0 0 0 2px #0969da",
        borderColor: "#0969da",
      }
    : baseStyle;

  return (
    <div style={style}>
      <Handle type="target" position={Position.Top} />
      {data.label as string}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { issue: IssueNode };

const NODE_WIDTH = 220;
const NODE_HEIGHT = 40;

/**
 * Issue 配列を ReactFlow の Node 配列に変換する。
 * position は仮の値（0, 0）で、layoutNodes で更新される。
 * 複数リポジトリがある場合はラベルに repo 名を含める。
 */
export function issuesToNodes(issues: Issue[]): Node[] {
  const repos = new Set(issues.map((i) => `${i.owner}/${i.repo}`));
  const isMultiRepo = repos.size > 1;

  return issues.map((issue) => ({
    id: issue.id,
    type: "issue",
    data: {
      label: isMultiRepo
        ? `${issue.repo}#${issue.number} ${issue.title}`
        : `#${issue.number} ${issue.title}`,
      style: {
        background: issue.state === "open" ? "#dafbe1" : "#f0e6ff",
        border: `1px solid ${issue.state === "open" ? "#1a7f37" : "#8250df"}`,
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 12,
        width: NODE_WIDTH,
      },
    },
    position: { x: 0, y: 0 },
  }));
}

/**
 * Dependency 配列を ReactFlow の Edge 配列に変換する。
 * エッジの種類に応じてスタイルを分岐する。
 */
export function dependenciesToEdges(dependencies: Dependency[]): Edge[] {
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
}

/**
 * 指定ノードから outgoing エッジを辿り、子孫ノードの ID を全て返す（再帰）。
 * sub_issue と blocked_by の両方のエッジを辿る。
 */
export function getDescendantIds(nodeId: string, edges: Edge[]): Set<string> {
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
}

/**
 * 指定ノードから incoming エッジを辿り、祖先ノードの ID を全て返す（再帰）。
 * sub_issue と blocked_by の両方のエッジを辿る。
 */
export function getAncestorIds(nodeId: string, edges: Edge[]): Set<string> {
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
}

const elk = new ELK();

/**
 * ELKjs を使って Node 配列にレイアウト座標を付与する。
 * 元の配列は変更せず、新しい配列を返す。
 */
export async function layoutNodes(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
): Promise<Node[]> {
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
}

export interface IssueGraphProps {
  issues: Issue[];
  dependencies: Dependency[];
  projectId: string;
  onNodeClick?: (issueId: string | null) => void;
  onEdgeDelete?: (source: string, target: string, type: DependencyType) => void;
  onEdgeAdd?: (source: string, target: string, type: DependencyType) => void;
}

export function IssueGraph(props: IssueGraphProps) {
  // issue の集合が変わったときだけリマウントし、ELK レイアウトを再計算する。
  // エッジの変更ではリマウントせず、ReactFlow の edges prop 更新だけで反映する。
  const issueKey = useMemo(() => {
    return props.issues
      .map((i) => i.id)
      .sort()
      .join(",");
  }, [props.issues]);

  return <IssueGraphInner key={issueKey} {...props} />;
}

function IssueGraphInner({
  issues,
  dependencies,
  projectId,
  onNodeClick,
  onEdgeDelete,
  onEdgeAdd,
}: IssueGraphProps) {
  const [layoutedNodes, setLayoutedNodes] = useState<Node[] | null>(null);

  // マウント時の dependencies でレイアウトを計算する。
  // エッジの追加/削除ではレイアウトを再計算しない（edges の useMemo 更新のみ）。
  const initialDepsRef = useRef(dependencies);

  useEffect(() => {
    let cancelled = false;
    const nodes = issuesToNodes(issues);
    const edges = dependenciesToEdges(initialDepsRef.current);
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
    });
    return () => {
      cancelled = true;
    };
  }, [issues, projectId]);

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
    <IssueGraphReady
      projectId={projectId}
      initialNodes={layoutedNodes}
      edges={edges}
      onNodeClick={onNodeClick}
      onEdgeDelete={onEdgeDelete}
      onEdgeAdd={onEdgeAdd}
    />
  );
}

function IssueGraphReady({
  projectId,
  initialNodes,
  edges,
  onNodeClick,
  onEdgeDelete,
  onEdgeAdd,
}: {
  projectId: string;
  initialNodes: Node[];
  edges: Edge[];
  onNodeClick?: (issueId: string | null) => void;
  onEdgeDelete?: (source: string, target: string, type: DependencyType) => void;
  onEdgeAdd?: (source: string, target: string, type: DependencyType) => void;
}) {
  const [connectionMode, setConnectionMode] =
    useState<DependencyType>("sub_issue");

  const [nodes, setNodes, onNodesChangeOriginal] = useNodesState(initialNodes);

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

  // --- コンテキストメニュー ---
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
    },
    [],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

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
        onPaneClick={closeContextMenu}
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
      {contextMenu && (
        <div
          style={{
            ...graphStyles.contextMenu,
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            type="button"
            style={graphStyles.contextMenuItem}
            onClick={handleSelectDescendants}
          >
            Select Descendants
          </button>
          <button
            type="button"
            style={graphStyles.contextMenuItem}
            onClick={handleSelectAncestors}
          >
            Select Ancestors
          </button>
          <div style={graphStyles.contextMenuDivider} />
          <button
            type="button"
            style={graphStyles.contextMenuItem}
            onClick={handleLayoutSelected}
          >
            Layout Selected
          </button>
        </div>
      )}
    </div>
  );
}

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
  contextMenu: {
    position: "fixed",
    zIndex: 1000,
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 6,
    boxShadow: "0 3px 12px rgba(0,0,0,0.15)",
    padding: "4px 0",
    minWidth: 160,
  },
  contextMenuItem: {
    display: "block",
    width: "100%",
    padding: "6px 12px",
    fontSize: 12,
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#24292f",
    textAlign: "left",
  },
  contextMenuDivider: {
    height: 1,
    margin: "4px 0",
    background: "#d0d7de",
  },
};
