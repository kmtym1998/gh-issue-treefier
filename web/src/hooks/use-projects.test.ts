import { describe, expect, it } from "vitest";
import type {
  GitHubProjectV2FieldNode,
  GitHubProjectV2Node,
} from "../types/github";
import { parseProjectFields, parseProjects } from "./use-projects";

describe("parseProjects", () => {
  it("converts GraphQL nodes to internal format", () => {
    const nodes: GitHubProjectV2Node[] = [
      { id: "PVT_1", title: "Sprint Board", number: 1 },
      { id: "PVT_2", title: "Roadmap", number: 2 },
    ];

    const result = parseProjects(nodes);

    expect(result).toEqual([
      { id: "PVT_1", title: "Sprint Board", number: 1 },
      { id: "PVT_2", title: "Roadmap", number: 2 },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(parseProjects([])).toEqual([]);
  });
});

describe("parseProjectFields", () => {
  it("converts supported field types", () => {
    const nodes: GitHubProjectV2FieldNode[] = [
      { id: "F1", name: "Title", dataType: "TEXT" },
      { id: "F2", name: "Priority", dataType: "NUMBER" },
      { id: "F3", name: "Due Date", dataType: "DATE" },
    ];

    const result = parseProjectFields(nodes);

    expect(result).toEqual([
      { id: "F1", name: "Title", dataType: "TEXT", options: [] },
      { id: "F2", name: "Priority", dataType: "NUMBER", options: [] },
      { id: "F3", name: "Due Date", dataType: "DATE", options: [] },
    ]);
  });

  it("extracts options from SINGLE_SELECT fields", () => {
    const nodes: GitHubProjectV2FieldNode[] = [
      {
        id: "F1",
        name: "Status",
        dataType: "SINGLE_SELECT",
        options: [
          { id: "O1", name: "Todo" },
          { id: "O2", name: "In Progress" },
          { id: "O3", name: "Done" },
        ],
      },
    ];

    const result = parseProjectFields(nodes);

    expect(result).toEqual([
      {
        id: "F1",
        name: "Status",
        dataType: "SINGLE_SELECT",
        options: [
          { id: "O1", name: "Todo" },
          { id: "O2", name: "In Progress" },
          { id: "O3", name: "Done" },
        ],
      },
    ]);
  });

  it("extracts iterations from ITERATION fields", () => {
    const nodes: GitHubProjectV2FieldNode[] = [
      {
        id: "F1",
        name: "Sprint",
        dataType: "ITERATION",
        configuration: {
          iterations: [
            { id: "I1", title: "Sprint 1" },
            { id: "I2", title: "Sprint 2" },
          ],
        },
      },
    ];

    const result = parseProjectFields(nodes);

    expect(result).toEqual([
      {
        id: "F1",
        name: "Sprint",
        dataType: "ITERATION",
        options: [
          { id: "I1", name: "Sprint 1" },
          { id: "I2", name: "Sprint 2" },
        ],
      },
    ]);
  });

  it("filters out unsupported field types", () => {
    const nodes: GitHubProjectV2FieldNode[] = [
      { id: "F1", name: "Title", dataType: "TEXT" },
      { id: "F2", name: "Assignees", dataType: "ASSIGNEES" },
      { id: "F3", name: "Labels", dataType: "LABELS" },
      { id: "F4", name: "Milestone", dataType: "MILESTONE" },
      { id: "F5", name: "Status", dataType: "SINGLE_SELECT", options: [] },
    ];

    const result = parseProjectFields(nodes);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Title");
    expect(result[1].name).toBe("Status");
  });

  it("handles ITERATION field without configuration", () => {
    const nodes: GitHubProjectV2FieldNode[] = [
      { id: "F1", name: "Sprint", dataType: "ITERATION" },
    ];

    const result = parseProjectFields(nodes);

    expect(result).toEqual([
      { id: "F1", name: "Sprint", dataType: "ITERATION", options: [] },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(parseProjectFields([])).toEqual([]);
  });
});
