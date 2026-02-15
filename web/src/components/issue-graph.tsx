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
  useNodesState,
} from "@xyflow/react";
import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import { useCallback, useEffect, useMemo, useState } from "react";
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
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.layered.wrapping.strategy": "MULTI_EDGE",
      "elk.aspectRatio": "1.6",
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
  onNodeClick?: (issueId: string) => void;
  onEdgeDelete?: (source: string, target: string, type: DependencyType) => void;
  onEdgeAdd?: (source: string, target: string, type: DependencyType) => void;
}

export function IssueGraph(props: IssueGraphProps) {
  // issue の集合が変わったときだけリマウントし、ELK レイアウトを再計算する
  const issueKey = useMemo(() => {
    const nodesPart = props.issues
      .map((i) => i.id)
      .sort()
      .join(",");
    const edgesPart = props.dependencies
      .map((d) => `${d.source}-${d.target}-${d.type}`)
      .sort()
      .join(",");
    return `${nodesPart}|${edgesPart}`;
  }, [props.issues, props.dependencies]);

  return <IssueGraphInner key={issueKey} {...props} />;
}

function IssueGraphInner({
  issues,
  dependencies,
  onNodeClick,
  onEdgeDelete,
  onEdgeAdd,
}: IssueGraphProps) {
  const [layoutedNodes, setLayoutedNodes] = useState<Node[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const nodes = issuesToNodes(issues);
    const edges = dependenciesToEdges(dependencies);
    layoutNodes(nodes, edges).then((result) => {
      if (!cancelled) setLayoutedNodes(result);
    });
    return () => {
      cancelled = true;
    };
  }, [issues, dependencies]);

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
      initialNodes={layoutedNodes}
      edges={edges}
      onNodeClick={onNodeClick}
      onEdgeDelete={onEdgeDelete}
      onEdgeAdd={onEdgeAdd}
    />
  );
}

function IssueGraphReady({
  initialNodes,
  edges,
  onNodeClick,
  onEdgeDelete,
  onEdgeAdd,
}: {
  initialNodes: Node[];
  edges: Edge[];
  onNodeClick?: (issueId: string) => void;
  onEdgeDelete?: (source: string, target: string, type: DependencyType) => void;
  onEdgeAdd?: (source: string, target: string, type: DependencyType) => void;
}) {
  const [connectionMode, setConnectionMode] =
    useState<DependencyType>("sub_issue");

  const [nodes, , onNodesChange] = useNodesState(initialNodes);

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
