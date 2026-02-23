// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Issue } from "../types/issue";
import { useOptimisticIssues } from "./use-optimistic-issues";

// TODO: makeIssue ヘルパーが use-pending-node-positions.test.ts と重複定義されている。
// __test-utils__/fixtures.ts に共通化すべき。
const makeIssue = (id: string, title = "test"): Issue => ({
  id,
  number: 1,
  owner: "owner",
  repo: "repo",
  title,
  state: "open",
  body: "",
  labels: [],
  assignees: [],
  url: `https://github.com/owner/repo/issues/1`,
  fieldValues: {},
});

describe("useOptimisticIssues", () => {
  it("returns server issues when no optimistic issues exist", () => {
    const serverIssues = [makeIssue("owner/repo#1")];
    const { result } = renderHook(() => useOptimisticIssues(serverIssues));
    expect(result.current.allIssues).toEqual(serverIssues);
  });

  it("appends optimistic issue to allIssues", () => {
    const serverIssues = [makeIssue("owner/repo#1")];
    const { result } = renderHook(() => useOptimisticIssues(serverIssues));

    act(() => {
      result.current.addOptimisticIssue(makeIssue("owner/repo#2", "new"));
    });

    expect(result.current.allIssues).toHaveLength(2);
    expect(result.current.allIssues[1].id).toBe("owner/repo#2");
  });

  it("removes optimistic issue once server data includes it", () => {
    const server1 = [makeIssue("owner/repo#1")];
    const { result, rerender } = renderHook(
      ({ issues }) => useOptimisticIssues(issues),
      { initialProps: { issues: server1 } },
    );

    act(() => {
      result.current.addOptimisticIssue(makeIssue("owner/repo#2", "new"));
    });
    expect(result.current.allIssues).toHaveLength(2);

    // サーバーデータに #2 が含まれるようになった
    const server2 = [makeIssue("owner/repo#1"), makeIssue("owner/repo#2")];
    rerender({ issues: server2 });

    expect(result.current.allIssues).toHaveLength(2);
    // 楽観的 Issue は重複しない
    const ids = result.current.allIssues.map((i) => i.id);
    expect(ids).toEqual(["owner/repo#1", "owner/repo#2"]);
  });

  it("does not duplicate if optimistic issue already in server data", () => {
    const serverIssues = [makeIssue("owner/repo#1")];
    const { result } = renderHook(() => useOptimisticIssues(serverIssues));

    act(() => {
      result.current.addOptimisticIssue(makeIssue("owner/repo#1", "dup"));
    });

    // 同じ ID なので重複しない
    expect(result.current.allIssues).toHaveLength(1);
  });
});
