import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { GitHubProjectV2Item } from "../types/github";
import {
  clearAllCache,
  getCachedItems,
  invalidateCache,
  setCachedItems,
} from "./idb-cache";

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

beforeEach(async () => {
  await clearAllCache();
});

describe("idb-cache", () => {
  it("returns null for a non-existent key", async () => {
    const result = await getCachedItems("non-existent");
    expect(result).toBeNull();
  });

  it("round-trips get/set", async () => {
    const items = [makeItem(1), makeItem(2)];
    await setCachedItems("project-1", items);

    const result = await getCachedItems("project-1");
    expect(result).not.toBeNull();
    expect(result?.projectId).toBe("project-1");
    expect(result?.items).toEqual(items);
    expect(result?.cachedAt).toBeTypeOf("number");
  });

  it("invalidateCache removes a specific project", async () => {
    await setCachedItems("project-1", [makeItem(1)]);
    await setCachedItems("project-2", [makeItem(2)]);

    await invalidateCache("project-1");

    expect(await getCachedItems("project-1")).toBeNull();
    expect(await getCachedItems("project-2")).not.toBeNull();
  });

  it("clearAllCache removes all entries", async () => {
    await setCachedItems("project-1", [makeItem(1)]);
    await setCachedItems("project-2", [makeItem(2)]);

    await clearAllCache();

    expect(await getCachedItems("project-1")).toBeNull();
    expect(await getCachedItems("project-2")).toBeNull();
  });

  it("overwrites existing cache on set", async () => {
    await setCachedItems("project-1", [makeItem(1)]);
    await setCachedItems("project-1", [makeItem(2), makeItem(3)]);

    const result = await getCachedItems("project-1");
    expect(result?.items).toHaveLength(2);
    expect(result?.items[0].content?.number).toBe(2);
  });
});
