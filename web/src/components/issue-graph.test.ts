import { describe, expect, it } from "vitest";
import type { Dependency, Issue } from "../types/issue";
import { dependenciesToEdges, issuesToNodes, layoutNodes } from "./issue-graph";

const sampleIssues: Issue[] = [
  {
    id: "owner/repo#1",
    number: 1,
    owner: "owner",
    repo: "repo",
    title: "Parent issue",
    state: "open",
    body: "",
    labels: [{ name: "bug", color: "d73a4a" }],
    assignees: [],
    url: "https://github.com/owner/repo/issues/1",
  },
  {
    id: "owner/repo#2",
    number: 2,
    owner: "owner",
    repo: "repo",
    title: "Child issue",
    state: "closed",
    body: "",
    labels: [],
    assignees: [],
    url: "https://github.com/owner/repo/issues/2",
  },
  {
    id: "owner/repo#3",
    number: 3,
    owner: "owner",
    repo: "repo",
    title: "Another child",
    state: "open",
    body: "",
    labels: [{ name: "enhancement", color: "a2eeef" }],
    assignees: [],
    url: "https://github.com/owner/repo/issues/3",
  },
];

const sampleDependencies: Dependency[] = [
  { source: "owner/repo#1", target: "owner/repo#2", type: "sub_issue" },
  { source: "owner/repo#1", target: "owner/repo#3", type: "sub_issue" },
];

describe("issuesToNodes", () => {
  it("converts issues to ReactFlow nodes with composite IDs", () => {
    const nodes = issuesToNodes(sampleIssues);

    expect(nodes).toHaveLength(3);
    expect(nodes[0].id).toBe("owner/repo#1");
    expect(nodes[0].type).toBe("issue");
    expect(nodes[0].data.label).toBe("#1 Parent issue");
    expect(nodes[1].id).toBe("owner/repo#2");
    expect(nodes[1].type).toBe("issue");
    expect(nodes[2].id).toBe("owner/repo#3");
    expect(nodes[2].type).toBe("issue");
  });

  it("includes repo name in label for multi-repo issues", () => {
    const multiRepoIssues: Issue[] = [
      {
        id: "owner/frontend#1",
        number: 1,
        owner: "owner",
        repo: "frontend",
        title: "UI bug",
        state: "open",
        body: "",
        labels: [],
        assignees: [],
        url: "https://github.com/owner/frontend/issues/1",
      },
      {
        id: "owner/backend#2",
        number: 2,
        owner: "owner",
        repo: "backend",
        title: "API fix",
        state: "open",
        body: "",
        labels: [],
        assignees: [],
        url: "https://github.com/owner/backend/issues/2",
      },
    ];

    const nodes = issuesToNodes(multiRepoIssues);

    expect(nodes[0].data.label).toBe("frontend#1 UI bug");
    expect(nodes[1].data.label).toBe("backend#2 API fix");
  });

  it("applies open state style", () => {
    const nodes = issuesToNodes([sampleIssues[0]]);

    expect(nodes[0].data.style).toMatchObject({
      background: "#dafbe1",
    });
  });

  it("applies closed state style", () => {
    const nodes = issuesToNodes([sampleIssues[1]]);

    expect(nodes[0].data.style).toMatchObject({
      background: "#f0e6ff",
    });
  });

  it("returns empty array for empty input", () => {
    expect(issuesToNodes([])).toEqual([]);
  });
});

describe("dependenciesToEdges", () => {
  it("converts sub_issue dependencies to solid grey edges", () => {
    const edges = dependenciesToEdges(sampleDependencies);

    expect(edges).toHaveLength(2);
    expect(edges[0]).toEqual({
      id: "e:sub_issue:owner/repo#1-owner/repo#2",
      source: "owner/repo#1",
      target: "owner/repo#2",
      animated: false,
      data: { type: "sub_issue" },
      style: { stroke: "#656d76" },
      markerEnd: { type: "arrowclosed", color: "#656d76" },
    });
    expect(edges[1]).toEqual({
      id: "e:sub_issue:owner/repo#1-owner/repo#3",
      source: "owner/repo#1",
      target: "owner/repo#3",
      animated: false,
      data: { type: "sub_issue" },
      style: { stroke: "#656d76" },
      markerEnd: { type: "arrowclosed", color: "#656d76" },
    });
  });

  it("converts blocked_by dependencies to dashed red edges", () => {
    const blockedByDeps: Dependency[] = [
      { source: "owner/repo#1", target: "owner/repo#2", type: "blocked_by" },
    ];
    const edges = dependenciesToEdges(blockedByDeps);

    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual({
      id: "e:blocked_by:owner/repo#1-owner/repo#2",
      source: "owner/repo#1",
      target: "owner/repo#2",
      animated: false,
      data: { type: "blocked_by" },
      style: { stroke: "#cf222e", strokeDasharray: "5 3" },
      markerEnd: { type: "arrowclosed", color: "#cf222e" },
    });
  });

  it("returns empty array for empty input", () => {
    expect(dependenciesToEdges([])).toEqual([]);
  });
});

describe("layoutNodes", () => {
  it("assigns positions to nodes", async () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const layouted = await layoutNodes(nodes, edges);

    expect(layouted).toHaveLength(3);
    for (const node of layouted) {
      expect(node.position.x).toBeTypeOf("number");
      expect(node.position.y).toBeTypeOf("number");
      expect(Number.isNaN(node.position.x)).toBe(false);
      expect(Number.isNaN(node.position.y)).toBe(false);
    }
  });

  it("sets TB direction positions correctly", async () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const layouted = await layoutNodes(nodes, edges, "TB");

    const nodeMap = Object.fromEntries(layouted.map((n) => [n.id, n]));

    expect(nodeMap["owner/repo#1"]).toBeDefined();
    expect(nodeMap["owner/repo#2"]).toBeDefined();
    expect(nodeMap["owner/repo#3"]).toBeDefined();
    expect(nodeMap["owner/repo#1"].position.y).toBeLessThan(
      nodeMap["owner/repo#2"].position.y,
    );
    expect(nodeMap["owner/repo#1"].position.y).toBeLessThan(
      nodeMap["owner/repo#3"].position.y,
    );
  });

  it("sets LR direction positions correctly", async () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const layouted = await layoutNodes(nodes, edges, "LR");

    const nodeMap = Object.fromEntries(layouted.map((n) => [n.id, n]));

    expect(nodeMap["owner/repo#1"]).toBeDefined();
    expect(nodeMap["owner/repo#2"]).toBeDefined();
    // wrapping が効く場合、親ノードの x が子と同じになることがあるため <=
    expect(nodeMap["owner/repo#1"].position.x).toBeLessThanOrEqual(
      nodeMap["owner/repo#2"].position.x,
    );
  });

  it("sets sourcePosition and targetPosition for TB direction", async () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const layouted = await layoutNodes(nodes, edges, "TB");

    for (const node of layouted) {
      expect(node.targetPosition).toBe("top");
      expect(node.sourcePosition).toBe("bottom");
    }
  });

  it("sets sourcePosition and targetPosition for LR direction", async () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const layouted = await layoutNodes(nodes, edges, "LR");

    for (const node of layouted) {
      expect(node.targetPosition).toBe("left");
      expect(node.sourcePosition).toBe("right");
    }
  });

  it("does not mutate original nodes", async () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const originalPositions = nodes.map((n) => ({ ...n.position }));

    await layoutNodes(nodes, edges);

    nodes.forEach((node, i) => {
      expect(node.position).toEqual(originalPositions[i]);
    });
  });

  it("handles nodes without edges", async () => {
    const nodes = issuesToNodes(sampleIssues);
    const layouted = await layoutNodes(nodes, []);

    expect(layouted).toHaveLength(3);
    for (const node of layouted) {
      expect(Number.isNaN(node.position.x)).toBe(false);
      expect(Number.isNaN(node.position.y)).toBe(false);
    }
  });

  it("handles empty input", async () => {
    expect(await layoutNodes([], [])).toEqual([]);
  });
});
