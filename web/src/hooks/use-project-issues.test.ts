import { describe, expect, it } from "vitest";
import type { GitHubProjectV2Item } from "../types/github";
import {
  buildIssueId,
  parseProjectDependencies,
  parseProjectItems,
} from "./use-project-issues";

type ItemContent = NonNullable<GitHubProjectV2Item["content"]>;

const defaultContent: ItemContent = {
  number: 1,
  title: "Test issue",
  state: "OPEN",
  body: "body text",
  url: "https://github.com/owner/repo/issues/1",
  repository: { owner: { login: "owner" }, name: "repo" },
  labels: { nodes: [] },
  assignees: { nodes: [] },
  subIssues: { nodes: [] },
  blockedBy: { nodes: [] },
  blocking: { nodes: [] },
};

const makeItem = (
  overrides: {
    id?: string;
    content?: Partial<ItemContent> | null;
    fieldValues?: GitHubProjectV2Item["fieldValues"];
  } = {},
): GitHubProjectV2Item => ({
  id: overrides.id ?? "PVTI_1",
  content:
    overrides.content === null
      ? null
      : { ...defaultContent, ...overrides.content },
  fieldValues: overrides.fieldValues ?? { nodes: [] },
});

describe("buildIssueId", () => {
  it("creates owner/repo#number format", () => {
    expect(buildIssueId("octocat", "hello-world", 42)).toBe(
      "octocat/hello-world#42",
    );
  });
});

describe("parseProjectItems", () => {
  it("converts project items to internal Issue format", () => {
    const items: GitHubProjectV2Item[] = [
      makeItem({
        content: {
          number: 1,
          title: "Bug fix",
          state: "OPEN",
          body: "Fix the login bug",
          url: "https://github.com/owner/repo/issues/1",
          repository: { owner: { login: "owner" }, name: "repo" },
          labels: { nodes: [{ name: "bug", color: "d73a4a" }] },
          assignees: {
            nodes: [
              { login: "alice", avatarUrl: "https://example.com/alice.png" },
            ],
          },
          subIssues: { nodes: [] },
        },
      }),
    ];

    const result = parseProjectItems(items);

    expect(result).toEqual([
      {
        id: "owner/repo#1",
        number: 1,
        owner: "owner",
        repo: "repo",
        title: "Bug fix",
        state: "open",
        body: "Fix the login bug",
        labels: [{ name: "bug", color: "d73a4a" }],
        assignees: [
          { login: "alice", avatarUrl: "https://example.com/alice.png" },
        ],
        url: "https://github.com/owner/repo/issues/1",
      },
    ]);
  });

  it("filters out DraftIssues (content === null)", () => {
    const items: GitHubProjectV2Item[] = [
      makeItem({ content: { number: 1 } }),
      makeItem({ id: "PVTI_2", content: null }),
    ];

    const result = parseProjectItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
  });

  it("filters out DraftIssues (content === empty object from GraphQL)", () => {
    // GraphQL の ... on Issue フラグメントは DraftIssue に対して {} を返す
    const items: GitHubProjectV2Item[] = [
      makeItem({ content: { number: 1 } }),
      {
        id: "PVTI_DRAFT",
        content: {} as GitHubProjectV2Item["content"],
        fieldValues: { nodes: [] },
      },
    ];

    const result = parseProjectItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
  });

  it("handles null body", () => {
    const items: GitHubProjectV2Item[] = [
      makeItem({ content: { body: null } }),
    ];

    const result = parseProjectItems(items);
    expect(result[0].body).toBe("");
  });

  it("returns empty array for empty input", () => {
    expect(parseProjectItems([])).toEqual([]);
  });
});

describe("parseProjectDependencies", () => {
  it("builds dependency edges from subIssues", () => {
    const items: GitHubProjectV2Item[] = [
      makeItem({
        content: {
          number: 1,
          repository: { owner: { login: "owner" }, name: "repo" },
          subIssues: {
            nodes: [
              {
                number: 10,
                repository: { owner: { login: "owner" }, name: "repo" },
              },
              {
                number: 11,
                repository: { owner: { login: "owner" }, name: "repo" },
              },
            ],
          },
        },
      }),
    ];

    const result = parseProjectDependencies(items);

    expect(result).toEqual([
      { source: "owner/repo#1", target: "owner/repo#10", type: "sub_issue" },
      { source: "owner/repo#1", target: "owner/repo#11", type: "sub_issue" },
    ]);
  });

  it("handles cross-repo sub-issues", () => {
    const items: GitHubProjectV2Item[] = [
      makeItem({
        content: {
          number: 1,
          repository: { owner: { login: "org" }, name: "frontend" },
          subIssues: {
            nodes: [
              {
                number: 5,
                repository: { owner: { login: "org" }, name: "backend" },
              },
            ],
          },
        },
      }),
    ];

    const result = parseProjectDependencies(items);

    expect(result).toEqual([
      { source: "org/frontend#1", target: "org/backend#5", type: "sub_issue" },
    ]);
  });

  it("skips items with null content", () => {
    const items: GitHubProjectV2Item[] = [makeItem({ content: null })];

    const result = parseProjectDependencies(items);
    expect(result).toEqual([]);
  });

  it("returns empty array when no sub-issues", () => {
    const items: GitHubProjectV2Item[] = [
      makeItem({ content: { subIssues: { nodes: [] } } }),
    ];

    const result = parseProjectDependencies(items);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(parseProjectDependencies([])).toEqual([]);
  });

  it("builds blocked_by edges from blockedBy field", () => {
    const items: GitHubProjectV2Item[] = [
      makeItem({
        content: {
          number: 5,
          repository: { owner: { login: "owner" }, name: "repo" },
          subIssues: { nodes: [] },
          blockedBy: {
            nodes: [
              {
                number: 3,
                repository: { owner: { login: "owner" }, name: "repo" },
              },
            ],
          },
          blocking: { nodes: [] },
        },
      }),
    ];

    const result = parseProjectDependencies(items);

    expect(result).toEqual([
      { source: "owner/repo#3", target: "owner/repo#5", type: "blocked_by" },
    ]);
  });

  it("builds blocked_by edges from blocking field", () => {
    const items: GitHubProjectV2Item[] = [
      makeItem({
        content: {
          number: 3,
          repository: { owner: { login: "owner" }, name: "repo" },
          subIssues: { nodes: [] },
          blockedBy: { nodes: [] },
          blocking: {
            nodes: [
              {
                number: 5,
                repository: { owner: { login: "owner" }, name: "repo" },
              },
            ],
          },
        },
      }),
    ];

    const result = parseProjectDependencies(items);

    expect(result).toEqual([
      { source: "owner/repo#3", target: "owner/repo#5", type: "blocked_by" },
    ]);
  });

  it("deduplicates blocked_by edges from both blockedBy and blocking", () => {
    const items: GitHubProjectV2Item[] = [
      makeItem({
        id: "PVTI_1",
        content: {
          number: 5,
          repository: { owner: { login: "owner" }, name: "repo" },
          subIssues: { nodes: [] },
          blockedBy: {
            nodes: [
              {
                number: 3,
                repository: { owner: { login: "owner" }, name: "repo" },
              },
            ],
          },
          blocking: { nodes: [] },
        },
      }),
      makeItem({
        id: "PVTI_2",
        content: {
          number: 3,
          repository: { owner: { login: "owner" }, name: "repo" },
          subIssues: { nodes: [] },
          blockedBy: { nodes: [] },
          blocking: {
            nodes: [
              {
                number: 5,
                repository: { owner: { login: "owner" }, name: "repo" },
              },
            ],
          },
        },
      }),
    ];

    const result = parseProjectDependencies(items);

    const blockedByEdges = result.filter((d) => d.type === "blocked_by");
    expect(blockedByEdges).toEqual([
      { source: "owner/repo#3", target: "owner/repo#5", type: "blocked_by" },
    ]);
  });
});
