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
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import dagre from "dagre";
import { useCallback, useEffect, useState } from "react";
import type { Dependency, DependencyType, Issue } from "../types/issue";

import "@xyflow/react/dist/style.css";

function IssueNode({ data }: NodeProps) {
  return (
    <div style={data.style as React.CSSProperties}>
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
 * dagre を使って Node 配列にレイアウト座標を付与する。
 * 元の配列は変更せず、新しい配列を返す。
 */
export function layoutNodes(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 60, nodesep: 30 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const isHorizontal = direction === "LR";

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      targetPosition: (isHorizontal ? "left" : "top") as Position,
      sourcePosition: (isHorizontal ? "right" : "bottom") as Position,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

export interface IssueGraphProps {
  issues: Issue[];
  dependencies: Dependency[];
  onNodeClick?: (issueId: string) => void;
  onEdgeDelete?: (source: string, target: string, type: DependencyType) => void;
  onEdgeAdd?: (source: string, target: string, type: DependencyType) => void;
}

export function IssueGraph({
  issues,
  dependencies,
  onNodeClick,
  onEdgeDelete,
  onEdgeAdd,
}: IssueGraphProps) {
  const [connectionMode, setConnectionMode] =
    useState<DependencyType>("sub_issue");

  const rawNodes = issuesToNodes(issues);
  const rawEdges = dependenciesToEdges(dependencies);
  const layouted = layoutNodes(rawNodes, rawEdges);

  const [nodes, setNodes, onNodesChange] = useNodesState(layouted);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges);

  useEffect(() => {
    const newNodes = issuesToNodes(issues);
    const newEdges = dependenciesToEdges(dependencies);
    const newLayouted = layoutNodes(newNodes, newEdges);
    setNodes(newLayouted);
    setEdges(newEdges);
  }, [issues, dependencies, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onConnect={handleConnect}
        connectionLineStyle={connectionLineStyle}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
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
  modeButtonActiveBlockedBy: {
    background: "#cf222e",
    color: "#fff",
    borderColor: "#cf222e",
  },
};
