import { describe, expect, it } from "vitest";
import { buildQueryParams, parseQueryParams } from "./use-filter-query-params";

describe("parseQueryParams", () => {
  it("returns empty object for empty search string", () => {
    expect(parseQueryParams("")).toEqual({});
  });

  it("parses owner", () => {
    expect(parseQueryParams("?owner=octocat")).toEqual({ owner: "octocat" });
  });

  it("parses state", () => {
    expect(parseQueryParams("?state=closed")).toEqual({ state: "closed" });
    expect(parseQueryParams("?state=all")).toEqual({ state: "all" });
  });

  it("ignores state=open since it is the default", () => {
    expect(parseQueryParams("?state=open")).toEqual({ state: "open" });
  });

  it("ignores invalid state values", () => {
    expect(parseQueryParams("?state=invalid")).toEqual({});
  });

  it("parses project_id", () => {
    expect(parseQueryParams("?project_id=PVT_123")).toEqual({
      projectId: "PVT_123",
    });
  });

  it("parses field filters", () => {
    expect(parseQueryParams("?field.Status=abc&field.Priority=high")).toEqual({
      fieldFilters: { Status: "abc", Priority: "high" },
    });
  });

  it("ignores empty field filter values", () => {
    expect(parseQueryParams("?field.Status=")).toEqual({});
  });

  it("parses all parameters together", () => {
    const search =
      "?owner=octocat&state=closed&project_id=PVT_1&field.Status=done";
    expect(parseQueryParams(search)).toEqual({
      owner: "octocat",
      state: "closed",
      projectId: "PVT_1",
      fieldFilters: { Status: "done" },
    });
  });
});

describe("buildQueryParams", () => {
  it("returns empty params for all defaults", () => {
    const params = buildQueryParams({
      owner: "",
      state: "open",
      projectId: "",
      fieldFilters: {},
    });
    expect(params.toString()).toBe("");
  });

  it("includes owner when non-empty", () => {
    const params = buildQueryParams({
      owner: "octocat",
      state: "open",
      projectId: "",
      fieldFilters: {},
    });
    expect(params.get("owner")).toBe("octocat");
    expect(params.has("state")).toBe(false);
  });

  it("includes state when not open", () => {
    const params = buildQueryParams({
      owner: "",
      state: "closed",
      projectId: "",
      fieldFilters: {},
    });
    expect(params.get("state")).toBe("closed");
  });

  it("omits state when open (default)", () => {
    const params = buildQueryParams({
      owner: "",
      state: "open",
      projectId: "",
      fieldFilters: {},
    });
    expect(params.has("state")).toBe(false);
  });

  it("includes project_id when non-empty", () => {
    const params = buildQueryParams({
      owner: "",
      state: "open",
      projectId: "PVT_1",
      fieldFilters: {},
    });
    expect(params.get("project_id")).toBe("PVT_1");
  });

  it("includes field filters with field. prefix", () => {
    const params = buildQueryParams({
      owner: "",
      state: "open",
      projectId: "",
      fieldFilters: { Status: "done", Priority: "high" },
    });
    expect(params.get("field.Status")).toBe("done");
    expect(params.get("field.Priority")).toBe("high");
  });

  it("omits empty field filter values", () => {
    const params = buildQueryParams({
      owner: "",
      state: "open",
      projectId: "",
      fieldFilters: { Status: "", Priority: "high" },
    });
    expect(params.has("field.Status")).toBe(false);
    expect(params.get("field.Priority")).toBe("high");
  });

  it("round-trips with parseQueryParams", () => {
    const filters = {
      owner: "octocat",
      state: "closed" as const,
      projectId: "PVT_1",
      fieldFilters: { Status: "done" },
    };
    const qs = `?${buildQueryParams(filters).toString()}`;
    expect(parseQueryParams(qs)).toEqual(filters);
  });
});
