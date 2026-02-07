import { describe, expect, it } from "vitest";
import type { Dependency, Issue } from "../types/issue";
import { dependenciesToEdges, issuesToNodes, layoutNodes } from "./issue-graph";

const sampleIssues: Issue[] = [
  {
    number: 1,
    title: "Parent issue",
    state: "open",
    body: "",
    labels: [{ name: "bug", color: "d73a4a" }],
    assignees: [],
    url: "https://github.com/owner/repo/issues/1",
  },
  {
    number: 2,
    title: "Child issue",
    state: "closed",
    body: "",
    labels: [],
    assignees: [],
    url: "https://github.com/owner/repo/issues/2",
  },
  {
    number: 3,
    title: "Another child",
    state: "open",
    body: "",
    labels: [{ name: "enhancement", color: "a2eeef" }],
    assignees: [],
    url: "https://github.com/owner/repo/issues/3",
  },
];

const sampleDependencies: Dependency[] = [
  { source: 1, target: 2 },
  { source: 1, target: 3 },
];

describe("issuesToNodes", () => {
  it("converts issues to ReactFlow nodes", () => {
    const nodes = issuesToNodes(sampleIssues);

    expect(nodes).toHaveLength(3);
    expect(nodes[0].id).toBe("1");
    expect(nodes[0].data.label).toBe("#1 Parent issue");
    expect(nodes[1].id).toBe("2");
    expect(nodes[2].id).toBe("3");
  });

  it("applies open state style", () => {
    const nodes = issuesToNodes([sampleIssues[0]]);

    expect(nodes[0].style).toMatchObject({
      background: "#dafbe1",
    });
  });

  it("applies closed state style", () => {
    const nodes = issuesToNodes([sampleIssues[1]]);

    expect(nodes[0].style).toMatchObject({
      background: "#f0e6ff",
    });
  });

  it("returns empty array for empty input", () => {
    expect(issuesToNodes([])).toEqual([]);
  });
});

describe("dependenciesToEdges", () => {
  it("converts dependencies to ReactFlow edges", () => {
    const edges = dependenciesToEdges(sampleDependencies);

    expect(edges).toHaveLength(2);
    expect(edges[0]).toEqual({
      id: "e1-2",
      source: "1",
      target: "2",
      animated: false,
    });
    expect(edges[1]).toEqual({
      id: "e1-3",
      source: "1",
      target: "3",
      animated: false,
    });
  });

  it("returns empty array for empty input", () => {
    expect(dependenciesToEdges([])).toEqual([]);
  });
});

describe("layoutNodes", () => {
  it("assigns positions to nodes", () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const layouted = layoutNodes(nodes, edges);

    expect(layouted).toHaveLength(3);
    for (const node of layouted) {
      expect(node.position.x).toBeTypeOf("number");
      expect(node.position.y).toBeTypeOf("number");
      expect(Number.isNaN(node.position.x)).toBe(false);
      expect(Number.isNaN(node.position.y)).toBe(false);
    }
  });

  it("sets TB direction positions correctly", () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const layouted = layoutNodes(nodes, edges, "TB");

    // Parent (node 1) should be above children (nodes 2, 3)
    const nodeMap = Object.fromEntries(layouted.map((n) => [n.id, n]));

    expect(nodeMap["1"]).toBeDefined();
    expect(nodeMap["2"]).toBeDefined();
    expect(nodeMap["3"]).toBeDefined();
    expect(nodeMap["1"].position.y).toBeLessThan(nodeMap["2"].position.y);
    expect(nodeMap["1"].position.y).toBeLessThan(nodeMap["3"].position.y);
  });

  it("sets LR direction positions correctly", () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const layouted = layoutNodes(nodes, edges, "LR");

    // Parent (node 1) should be left of children (nodes 2, 3)
    const nodeMap = Object.fromEntries(layouted.map((n) => [n.id, n]));

    expect(nodeMap["1"]).toBeDefined();
    expect(nodeMap["2"]).toBeDefined();
    expect(nodeMap["1"].position.x).toBeLessThan(nodeMap["2"].position.x);
  });

  it("sets sourcePosition and targetPosition for TB direction", () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const layouted = layoutNodes(nodes, edges, "TB");

    for (const node of layouted) {
      expect(node.targetPosition).toBe("top");
      expect(node.sourcePosition).toBe("bottom");
    }
  });

  it("sets sourcePosition and targetPosition for LR direction", () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const layouted = layoutNodes(nodes, edges, "LR");

    for (const node of layouted) {
      expect(node.targetPosition).toBe("left");
      expect(node.sourcePosition).toBe("right");
    }
  });

  it("does not mutate original nodes", () => {
    const nodes = issuesToNodes(sampleIssues);
    const edges = dependenciesToEdges(sampleDependencies);
    const originalPositions = nodes.map((n) => ({ ...n.position }));

    layoutNodes(nodes, edges);

    nodes.forEach((node, i) => {
      expect(node.position).toEqual(originalPositions[i]);
    });
  });

  it("handles nodes without edges", () => {
    const nodes = issuesToNodes(sampleIssues);
    const layouted = layoutNodes(nodes, []);

    expect(layouted).toHaveLength(3);
    for (const node of layouted) {
      expect(Number.isNaN(node.position.x)).toBe(false);
      expect(Number.isNaN(node.position.y)).toBe(false);
    }
  });

  it("handles empty input", () => {
    expect(layoutNodes([], [])).toEqual([]);
  });
});
