// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildIssueId, useProjectIssues } from "./use-project-issues";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("../lib/cache", () => ({
  getCachedItems: vi.fn().mockResolvedValue(null),
  setCachedItems: vi.fn().mockResolvedValue(undefined),
  invalidateCache: vi.fn(),
}));

beforeEach(() => {
  mockFetch.mockReset();
});

// TODO: jsonResponse ヘルパーが 6 つのテストファイルで重複定義されている。
// __test-utils__/fetch.ts に共通化すべき。
const jsonResponse = (body: unknown, status = 200, statusText = "OK") =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });

const makeGraphQLResponse = (items: unknown[]) =>
  jsonResponse({
    data: {
      node: {
        items: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: items,
        },
      },
    },
  });

const makeItem = (
  overrides: {
    id?: string;
    number?: number;
    title?: string;
    state?: string;
    body?: string | null;
    owner?: string;
    repo?: string;
    labels?: Array<{ name: string; color: string }>;
    assignees?: Array<{ login: string; avatarUrl: string }>;
    subIssues?: Array<{ number: number; owner?: string; repo?: string }>;
    blockedBy?: Array<{ number: number; owner?: string; repo?: string }>;
    blocking?: Array<{ number: number; owner?: string; repo?: string }>;
    fieldValues?: unknown[];
    contentNull?: boolean;
  } = {},
) => {
  if (overrides.contentNull) {
    return {
      id: overrides.id ?? "PVTI_1",
      content: null,
      fieldValues: { nodes: overrides.fieldValues ?? [] },
    };
  }

  const owner = overrides.owner ?? "owner";
  const repo = overrides.repo ?? "repo";
  const number = overrides.number ?? 1;

  return {
    id: overrides.id ?? "PVTI_1",
    content: {
      number,
      title: overrides.title ?? "Test issue",
      state: overrides.state ?? "OPEN",
      body: overrides.body === undefined ? "body text" : overrides.body,
      url: `https://github.com/${owner}/${repo}/issues/${number}`,
      repository: { owner: { login: owner }, name: repo },
      labels: { nodes: overrides.labels ?? [] },
      assignees: { nodes: overrides.assignees ?? [] },
      subIssues: {
        nodes: (overrides.subIssues ?? []).map((s) => ({
          number: s.number,
          repository: {
            owner: { login: s.owner ?? owner },
            name: s.repo ?? repo,
          },
        })),
      },
      blockedBy: {
        nodes: (overrides.blockedBy ?? []).map((b) => ({
          number: b.number,
          repository: {
            owner: { login: b.owner ?? owner },
            name: b.repo ?? repo,
          },
        })),
      },
      blocking: {
        nodes: (overrides.blocking ?? []).map((b) => ({
          number: b.number,
          repository: {
            owner: { login: b.owner ?? owner },
            name: b.repo ?? repo,
          },
        })),
      },
    },
    fieldValues: { nodes: overrides.fieldValues ?? [] },
  };
};

describe("buildIssueId", () => {
  it("creates owner/repo#number format", () => {
    expect(buildIssueId("octocat", "hello-world", 42)).toBe(
      "octocat/hello-world#42",
    );
  });
});

describe("useProjectIssues", () => {
  it("fetches and parses project items", async () => {
    mockFetch.mockResolvedValueOnce(
      makeGraphQLResponse([
        makeItem({
          number: 1,
          title: "Bug fix",
          state: "OPEN",
          body: "Fix the login bug",
          labels: [{ name: "bug", color: "d73a4a" }],
          assignees: [
            { login: "alice", avatarUrl: "https://example.com/alice.png" },
          ],
        }),
      ]),
    );

    const { result } = renderHook(() =>
      useProjectIssues({ projectId: "PVT_1" }),
    );

    await waitFor(() => {
      expect(result.current.issues).toHaveLength(1);
    });

    expect(result.current.issues).toEqual([
      expect.objectContaining({
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
      }),
    ]);
    expect(result.current.error).toBeNull();
  });

  it("filters out DraftIssues (content === null)", async () => {
    mockFetch.mockResolvedValueOnce(
      makeGraphQLResponse([
        makeItem({ number: 1 }),
        makeItem({ id: "PVTI_2", contentNull: true }),
      ]),
    );

    const { result } = renderHook(() =>
      useProjectIssues({ projectId: "PVT_1" }),
    );

    await waitFor(() => {
      expect(result.current.issues).toHaveLength(1);
    });

    expect(result.current.issues[0].number).toBe(1);
  });

  it("filters out DraftIssues (content === empty object)", async () => {
    mockFetch.mockResolvedValueOnce(
      makeGraphQLResponse([
        makeItem({ number: 1 }),
        { id: "PVTI_DRAFT", content: {}, fieldValues: { nodes: [] } },
      ]),
    );

    const { result } = renderHook(() =>
      useProjectIssues({ projectId: "PVT_1" }),
    );

    await waitFor(() => {
      expect(result.current.issues).toHaveLength(1);
    });

    expect(result.current.issues[0].number).toBe(1);
  });

  it("handles null body", async () => {
    mockFetch.mockResolvedValueOnce(
      makeGraphQLResponse([makeItem({ body: null })]),
    );

    const { result } = renderHook(() =>
      useProjectIssues({ projectId: "PVT_1" }),
    );

    await waitFor(() => {
      expect(result.current.issues).toHaveLength(1);
    });

    expect(result.current.issues[0].body).toBe("");
  });

  it("returns empty arrays when projectId is empty", () => {
    const { result } = renderHook(() => useProjectIssues({ projectId: "" }));
    expect(result.current.issues).toEqual([]);
    expect(result.current.dependencies).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("builds dependency edges from subIssues", async () => {
    mockFetch.mockResolvedValueOnce(
      makeGraphQLResponse([
        makeItem({
          number: 1,
          subIssues: [{ number: 10 }, { number: 11 }],
        }),
      ]),
    );

    const { result } = renderHook(() =>
      useProjectIssues({ projectId: "PVT_1" }),
    );

    await waitFor(() => {
      expect(result.current.dependencies).toHaveLength(2);
    });

    expect(result.current.dependencies).toEqual([
      { source: "owner/repo#1", target: "owner/repo#10", type: "sub_issue" },
      { source: "owner/repo#1", target: "owner/repo#11", type: "sub_issue" },
    ]);
  });

  it("handles cross-repo sub-issues", async () => {
    mockFetch.mockResolvedValueOnce(
      makeGraphQLResponse([
        makeItem({
          number: 1,
          owner: "org",
          repo: "frontend",
          subIssues: [{ number: 5, owner: "org", repo: "backend" }],
        }),
      ]),
    );

    const { result } = renderHook(() =>
      useProjectIssues({ projectId: "PVT_1" }),
    );

    await waitFor(() => {
      expect(result.current.dependencies).toHaveLength(1);
    });

    expect(result.current.dependencies).toEqual([
      {
        source: "org/frontend#1",
        target: "org/backend#5",
        type: "sub_issue",
      },
    ]);
  });

  it("builds blocked_by edges from blockedBy field", async () => {
    mockFetch.mockResolvedValueOnce(
      makeGraphQLResponse([
        makeItem({
          number: 5,
          blockedBy: [{ number: 3 }],
        }),
      ]),
    );

    const { result } = renderHook(() =>
      useProjectIssues({ projectId: "PVT_1" }),
    );

    await waitFor(() => {
      expect(result.current.dependencies).toHaveLength(1);
    });

    expect(result.current.dependencies).toEqual([
      { source: "owner/repo#3", target: "owner/repo#5", type: "blocked_by" },
    ]);
  });

  it("builds blocked_by edges from blocking field", async () => {
    mockFetch.mockResolvedValueOnce(
      makeGraphQLResponse([
        makeItem({
          number: 3,
          blocking: [{ number: 5 }],
        }),
      ]),
    );

    const { result } = renderHook(() =>
      useProjectIssues({ projectId: "PVT_1" }),
    );

    await waitFor(() => {
      expect(result.current.dependencies).toHaveLength(1);
    });

    expect(result.current.dependencies).toEqual([
      { source: "owner/repo#3", target: "owner/repo#5", type: "blocked_by" },
    ]);
  });

  it("deduplicates blocked_by edges from both blockedBy and blocking", async () => {
    mockFetch.mockResolvedValueOnce(
      makeGraphQLResponse([
        makeItem({
          id: "PVTI_1",
          number: 5,
          blockedBy: [{ number: 3 }],
        }),
        makeItem({
          id: "PVTI_2",
          number: 3,
          blocking: [{ number: 5 }],
        }),
      ]),
    );

    const { result } = renderHook(() =>
      useProjectIssues({ projectId: "PVT_1" }),
    );

    await waitFor(() => {
      expect(result.current.dependencies).toHaveLength(1);
    });

    const blockedByEdges = result.current.dependencies.filter(
      (d) => d.type === "blocked_by",
    );
    expect(blockedByEdges).toEqual([
      { source: "owner/repo#3", target: "owner/repo#5", type: "blocked_by" },
    ]);
  });

  it("filters issues by state option", async () => {
    mockFetch.mockResolvedValueOnce(
      makeGraphQLResponse([
        makeItem({ number: 1, state: "OPEN" }),
        makeItem({ id: "PVTI_2", number: 2, state: "CLOSED" }),
      ]),
    );

    const { result } = renderHook(() =>
      useProjectIssues({ projectId: "PVT_1", state: "open" }),
    );

    await waitFor(() => {
      expect(result.current.issues).toHaveLength(1);
    });

    expect(result.current.issues[0].number).toBe(1);
  });
});
