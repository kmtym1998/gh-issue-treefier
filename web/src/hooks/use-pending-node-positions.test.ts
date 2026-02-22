// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Issue } from "../types/issue";
import { usePendingNodePositions } from "./use-pending-node-positions";

vi.mock("../lib/cache", () => ({
  getNodePositions: vi.fn().mockResolvedValue(null),
  setNodePositions: vi.fn().mockResolvedValue(undefined),
}));

// TODO: makeIssue ヘルパーが use-optimistic-issues.test.ts と重複定義されている。
// __test-utils__/fixtures.ts に共通化すべき。
const makeIssue = (id: string): Issue => ({
  id,
  number: 1,
  owner: "owner",
  repo: "repo",
  title: "test",
  state: "open",
  body: "",
  labels: [],
  assignees: [],
  url: "https://github.com/owner/repo/issues/1",
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePendingNodePositions", () => {
  it("returns empty pendingNodePositions initially", () => {
    const issues = [makeIssue("owner/repo#1")];
    const { result } = renderHook(() =>
      usePendingNodePositions("PVT_1", issues),
    );
    expect(result.current.pendingNodePositions).toEqual({});
  });

  it("assignReservedPosition assigns the reserved position to the given issue ID", () => {
    const issues = [makeIssue("owner/repo#1")];
    const { result } = renderHook(() =>
      usePendingNodePositions("PVT_1", issues),
    );

    act(() => {
      result.current.reservePosition({ x: 100, y: 200 });
    });

    act(() => {
      result.current.assignReservedPosition("owner/repo#2");
    });

    expect(result.current.pendingNodePositions["owner/repo#2"]).toEqual({
      x: 100,
      y: 200,
    });
  });

  it("assignReservedPosition does nothing if no position was reserved", () => {
    const issues = [makeIssue("owner/repo#1")];
    const { result } = renderHook(() =>
      usePendingNodePositions("PVT_1", issues),
    );

    act(() => {
      result.current.assignReservedPosition("owner/repo#2");
    });

    expect(result.current.pendingNodePositions).toEqual({});
  });

  it("auto-assigns reserved position when new issues appear", () => {
    const initial = [makeIssue("owner/repo#1")];
    const { result, rerender } = renderHook(
      ({ issues }) => usePendingNodePositions("PVT_1", issues),
      { initialProps: { issues: initial } },
    );

    act(() => {
      result.current.reservePosition({ x: 50, y: 60 });
    });

    // 新しい issue が追加される
    const updated = [makeIssue("owner/repo#1"), makeIssue("owner/repo#2")];
    rerender({ issues: updated });

    expect(result.current.pendingNodePositions["owner/repo#2"]).toEqual({
      x: 50,
      y: 60,
    });
  });

  it("clearReservedPosition prevents auto-assignment", () => {
    const initial = [makeIssue("owner/repo#1")];
    const { result, rerender } = renderHook(
      ({ issues }) => usePendingNodePositions("PVT_1", issues),
      { initialProps: { issues: initial } },
    );

    act(() => {
      result.current.reservePosition({ x: 50, y: 60 });
    });

    act(() => {
      result.current.clearReservedPosition();
    });

    const updated = [makeIssue("owner/repo#1"), makeIssue("owner/repo#2")];
    rerender({ issues: updated });

    expect(result.current.pendingNodePositions).toEqual({});
  });

  it("assignPosition directly sets position for a specific ID", () => {
    const issues = [makeIssue("owner/repo#1")];
    const { result } = renderHook(() =>
      usePendingNodePositions("PVT_1", issues),
    );

    act(() => {
      result.current.assignPosition("owner/repo#3", { x: 300, y: 400 });
    });

    expect(result.current.pendingNodePositions["owner/repo#3"]).toEqual({
      x: 300,
      y: 400,
    });
  });
});
