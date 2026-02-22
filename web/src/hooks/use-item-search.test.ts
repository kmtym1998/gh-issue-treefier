// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useItemSearch } from "./use-item-search";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  vi.useFakeTimers();
});

// TODO: jsonResponse ヘルパーが 6 つのテストファイルで重複定義されている。
// __test-utils__/fetch.ts に共通化すべき。
const jsonResponse = (body: unknown, status = 200, statusText = "OK") =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });

describe("useItemSearch", () => {
  it("clears results and does not fetch for empty query", () => {
    const { result } = renderHook(() => useItemSearch());

    act(() => {
      result.current.search("", "owner", "issue");
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("debounces and fetches search results", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        total_count: 1,
        items: [
          {
            number: 42,
            title: "Fix bug",
            state: "open",
            node_id: "I_42",
            repository_url: "https://api.github.com/repos/octocat/repo",
          },
        ],
      }),
    );

    const { result } = renderHook(() => useItemSearch());

    act(() => {
      result.current.search("bug", "octocat", "issue");
    });

    expect(result.current.loading).toBe(true);
    // fetch はまだ呼ばれていない（デバウンス中）
    expect(mockFetch).not.toHaveBeenCalled();

    // デバウンスタイマーを進める
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain(
      "/api/github/rest/search/issues",
    );

    expect(result.current.results).toEqual([
      {
        number: 42,
        title: "Fix bug",
        state: "open",
        owner: "octocat",
        repo: "repo",
        nodeId: "I_42",
        isPullRequest: false,
      },
    ]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("identifies pull requests", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        total_count: 1,
        items: [
          {
            number: 10,
            title: "Add feature",
            state: "closed",
            node_id: "PR_10",
            pull_request: { url: "..." },
            repository_url: "https://api.github.com/repos/org/lib",
          },
        ],
      }),
    );

    const { result } = renderHook(() => useItemSearch());

    act(() => {
      result.current.search("feature", "org", "pr");
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.results[0].isPullRequest).toBe(true);
    expect(result.current.results[0].state).toBe("closed");
  });

  it("sets error on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "rate limit" }, 403, "Forbidden"),
    );

    const { result } = renderHook(() => useItemSearch());

    act(() => {
      result.current.search("test", "owner", "issue");
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("cancels previous debounced search when a new one is triggered", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        total_count: 1,
        items: [
          {
            number: 1,
            title: "Second",
            state: "open",
            node_id: "I_1",
            repository_url: "https://api.github.com/repos/o/r",
          },
        ],
      }),
    );

    const { result } = renderHook(() => useItemSearch());

    act(() => {
      result.current.search("first", "owner", "issue");
    });

    // 200ms 後に別の検索をトリガー（最初のデバウンスはキャンセルされる）
    act(() => {
      vi.advanceTimersByTime(200);
      result.current.search("second", "owner", "issue");
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // 1回だけ fetch される（2回目の検索のみ）
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("second");
  });
});
