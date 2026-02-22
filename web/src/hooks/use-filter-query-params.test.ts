// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useFilterQueryParams } from "./use-filter-query-params";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("useFilterQueryParams", () => {
  describe("initialFilters", () => {
    it("returns empty object for empty search string", () => {
      const { result } = renderHook(() => useFilterQueryParams());
      expect(result.current.initialFilters).toEqual({});
    });

    it("parses owner", () => {
      window.history.replaceState(null, "", "?owner=octocat");
      const { result } = renderHook(() => useFilterQueryParams());
      expect(result.current.initialFilters).toEqual({ owner: "octocat" });
    });

    it("parses state=closed", () => {
      window.history.replaceState(null, "", "?state=closed");
      const { result } = renderHook(() => useFilterQueryParams());
      expect(result.current.initialFilters).toEqual({ state: "closed" });
    });

    it("parses state=all", () => {
      window.history.replaceState(null, "", "?state=all");
      const { result } = renderHook(() => useFilterQueryParams());
      expect(result.current.initialFilters).toEqual({ state: "all" });
    });

    it("parses state=open", () => {
      window.history.replaceState(null, "", "?state=open");
      const { result } = renderHook(() => useFilterQueryParams());
      expect(result.current.initialFilters).toEqual({ state: "open" });
    });

    it("ignores invalid state values", () => {
      window.history.replaceState(null, "", "?state=invalid");
      const { result } = renderHook(() => useFilterQueryParams());
      expect(result.current.initialFilters).toEqual({});
    });

    it("parses project_id", () => {
      window.history.replaceState(null, "", "?project_id=PVT_123");
      const { result } = renderHook(() => useFilterQueryParams());
      expect(result.current.initialFilters).toEqual({ projectId: "PVT_123" });
    });

    it("parses field filters", () => {
      window.history.replaceState(
        null,
        "",
        "?field.Status=abc&field.Priority=high",
      );
      const { result } = renderHook(() => useFilterQueryParams());
      expect(result.current.initialFilters).toEqual({
        fieldFilters: { Status: "abc", Priority: "high" },
      });
    });

    it("ignores empty field filter values", () => {
      window.history.replaceState(null, "", "?field.Status=");
      const { result } = renderHook(() => useFilterQueryParams());
      expect(result.current.initialFilters).toEqual({});
    });

    it("parses all parameters together", () => {
      window.history.replaceState(
        null,
        "",
        "?owner=octocat&state=closed&project_id=PVT_1&field.Status=done",
      );
      const { result } = renderHook(() => useFilterQueryParams());
      expect(result.current.initialFilters).toEqual({
        owner: "octocat",
        state: "closed",
        projectId: "PVT_1",
        fieldFilters: { Status: "done" },
      });
    });
  });

  describe("syncToUrl", () => {
    it("sets empty params for all defaults", () => {
      const { result } = renderHook(() => useFilterQueryParams());
      act(() => {
        result.current.syncToUrl({
          owner: "",
          state: "open",
          projectId: "",
          fieldFilters: {},
        });
      });
      expect(window.location.search).toBe("");
    });

    it("includes owner when non-empty", () => {
      const { result } = renderHook(() => useFilterQueryParams());
      act(() => {
        result.current.syncToUrl({
          owner: "octocat",
          state: "open",
          projectId: "",
          fieldFilters: {},
        });
      });
      expect(window.location.search).toBe("?owner=octocat");
    });

    it("includes state when not open", () => {
      const { result } = renderHook(() => useFilterQueryParams());
      act(() => {
        result.current.syncToUrl({
          owner: "",
          state: "closed",
          projectId: "",
          fieldFilters: {},
        });
      });
      expect(window.location.search).toBe("?state=closed");
    });

    it("omits state when open (default)", () => {
      const { result } = renderHook(() => useFilterQueryParams());
      act(() => {
        result.current.syncToUrl({
          owner: "",
          state: "open",
          projectId: "",
          fieldFilters: {},
        });
      });
      expect(window.location.search).toBe("");
    });

    it("includes project_id when non-empty", () => {
      const { result } = renderHook(() => useFilterQueryParams());
      act(() => {
        result.current.syncToUrl({
          owner: "",
          state: "open",
          projectId: "PVT_1",
          fieldFilters: {},
        });
      });
      expect(window.location.search).toBe("?project_id=PVT_1");
    });

    it("includes field filters with field. prefix", () => {
      const { result } = renderHook(() => useFilterQueryParams());
      act(() => {
        result.current.syncToUrl({
          owner: "",
          state: "open",
          projectId: "",
          fieldFilters: { Status: "done", Priority: "high" },
        });
      });
      const params = new URLSearchParams(window.location.search);
      expect(params.get("field.Status")).toBe("done");
      expect(params.get("field.Priority")).toBe("high");
    });

    it("omits empty field filter values", () => {
      const { result } = renderHook(() => useFilterQueryParams());
      act(() => {
        result.current.syncToUrl({
          owner: "",
          state: "open",
          projectId: "",
          fieldFilters: { Status: "", Priority: "high" },
        });
      });
      const params = new URLSearchParams(window.location.search);
      expect(params.has("field.Status")).toBe(false);
      expect(params.get("field.Priority")).toBe("high");
    });

    it("round-trips: syncToUrl then new hook reads back same values", () => {
      const filters = {
        owner: "octocat",
        state: "closed" as const,
        projectId: "PVT_1",
        fieldFilters: { Status: "done" },
      };
      const { result: r1 } = renderHook(() => useFilterQueryParams());
      act(() => {
        r1.current.syncToUrl(filters);
      });

      const { result: r2 } = renderHook(() => useFilterQueryParams());
      expect(r2.current.initialFilters).toEqual(filters);
    });
  });
});
