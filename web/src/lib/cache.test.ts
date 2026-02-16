import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GitHubProjectV2Item } from "../types/github";
import {
  getCachedItems,
  getNodePositions,
  invalidateCache,
  setCachedItems,
  setNodePositions,
} from "./cache";

const makeItem = (number: number): GitHubProjectV2Item => ({
  id: `PVTI_${number}`,
  content: {
    number,
    title: `Issue ${number}`,
    state: "OPEN",
    body: null,
    url: `https://github.com/owner/repo/issues/${number}`,
    repository: { owner: { login: "owner" }, name: "repo" },
    labels: { nodes: [] },
    assignees: { nodes: [] },
    subIssues: { nodes: [] },
    blockedBy: { nodes: [] },
    blocking: { nodes: [] },
  },
  fieldValues: { nodes: [] },
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchOk(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function mockFetchNoContent() {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
}

function mockFetchError() {
  fetchMock.mockRejectedValueOnce(new Error("network error"));
}

describe("cache (server-backed)", () => {
  it("returns null when items is null", async () => {
    mockFetchOk({ items: null, nodePositions: {} });
    const result = await getCachedItems("project-1");
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/cache/project-1", undefined);
  });

  it("round-trips get/set", async () => {
    const items = [makeItem(1), makeItem(2)];
    mockFetchNoContent(); // setCachedItems PUT
    await setCachedItems("project-1", items);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cache/project-1/items",
      expect.objectContaining({ method: "PUT" }),
    );

    mockFetchOk({ items, nodePositions: {} }); // getCachedItems GET
    const result = await getCachedItems("project-1");
    expect(result).not.toBeNull();
    expect(result?.projectId).toBe("project-1");
    expect(result?.items).toEqual(items);
    expect(result?.cachedAt).toBeTypeOf("number");
  });

  it("invalidateCache calls DELETE", async () => {
    mockFetchNoContent();
    await invalidateCache("project-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cache/project-1/items",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns null on fetch error", async () => {
    mockFetchError();
    const result = await getCachedItems("project-1");
    expect(result).toBeNull();
  });
});

describe("nodePositions (server-backed)", () => {
  it("returns null when positions are empty", async () => {
    mockFetchOk({ items: null, nodePositions: {} });
    const result = await getNodePositions("project-1");
    expect(result).toBeNull();
  });

  it("returns positions when present", async () => {
    const positions = { node1: { x: 10, y: 20 }, node2: { x: 30, y: 40 } };
    mockFetchOk({ items: null, nodePositions: positions });

    const result = await getNodePositions("project-1");
    expect(result).not.toBeNull();
    expect(result?.projectId).toBe("project-1");
    expect(result?.positions).toEqual(positions);
  });

  it("setNodePositions calls PUT", async () => {
    const positions = { node1: { x: 99, y: 99 } };
    mockFetchNoContent();
    await setNodePositions("project-1", positions);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cache/project-1/node-positions",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(positions),
      }),
    );
  });

  it("returns null on fetch error", async () => {
    mockFetchError();
    const result = await getNodePositions("project-1");
    expect(result).toBeNull();
  });
});
