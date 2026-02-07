import {
  Background,
  type Edge,
  type Node,
  type Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import dagre from "dagre";
import { useEffect } from "react";
import type { Dependency, Issue } from "../types/issue";

import "@xyflow/react/dist/style.css";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 40;

/**
 * Issue 配列を ReactFlow の Node 配列に変換する。
 * position は仮の値（0, 0）で、layoutNodes で更新される。
 */
export function issuesToNodes(issues: Issue[]): Node[] {
  return issues.map((issue) => ({
    id: String(issue.number),
    data: {
      label: `#${issue.number} ${issue.title}`,
    },
    position: { x: 0, y: 0 },
    style: {
      background: issue.state === "open" ? "#dafbe1" : "#f0e6ff",
      border: `1px solid ${issue.state === "open" ? "#1a7f37" : "#8250df"}`,
      borderRadius: 6,
      padding: "6px 10px",
      fontSize: 12,
      width: NODE_WIDTH,
    },
  }));
}

/**
 * Dependency 配列を ReactFlow の Edge 配列に変換する。
 */
export function dependenciesToEdges(dependencies: Dependency[]): Edge[] {
  return dependencies.map((dep) => ({
    id: `e${dep.source}-${dep.target}`,
    source: String(dep.source),
    target: String(dep.target),
    animated: false,
  }));
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
}

export function IssueGraph({ issues, dependencies }: IssueGraphProps) {
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

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
