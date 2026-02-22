// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectFields, useProjects } from "./use-projects";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

const jsonResponse = (body: unknown, status = 200, statusText = "OK") =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });

describe("useProjects", () => {
  it("fetches projects for a user", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          user: {
            projectsV2: {
              nodes: [
                { id: "PVT_1", title: "Sprint Board", number: 1 },
                { id: "PVT_2", title: "Roadmap", number: 2 },
              ],
            },
          },
        },
      }),
    );

    const { result } = renderHook(() => useProjects("octocat"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.projects).toEqual([
      { id: "PVT_1", title: "Sprint Board", number: 1 },
      { id: "PVT_2", title: "Roadmap", number: 2 },
    ]);
    expect(result.current.error).toBeNull();
  });

  it("falls back to organization query when user returns empty", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: { user: { projectsV2: { nodes: [] } } },
      }),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          organization: {
            projectsV2: {
              nodes: [{ id: "PVT_3", title: "Org Board", number: 1 }],
            },
          },
        },
      }),
    );

    const { result } = renderHook(() => useProjects("my-org"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.projects).toEqual([
      { id: "PVT_3", title: "Org Board", number: 1 },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("falls back to organization query when user query fails", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Not Found" }, 404, "Not Found"),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          organization: {
            projectsV2: {
              nodes: [{ id: "PVT_3", title: "Org Board", number: 1 }],
            },
          },
        },
      }),
    );

    const { result } = renderHook(() => useProjects("my-org"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.projects).toEqual([
      { id: "PVT_3", title: "Org Board", number: 1 },
    ]);
  });

  it("returns empty projects when owner is empty", () => {
    const { result } = renderHook(() => useProjects(""));
    expect(result.current.projects).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("useProjectFields", () => {
  it("fetches and parses fields with supported types", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          node: {
            fields: {
              nodes: [
                { id: "F1", name: "Title", dataType: "TEXT" },
                { id: "F2", name: "Priority", dataType: "NUMBER" },
                { id: "F3", name: "Due Date", dataType: "DATE" },
              ],
            },
          },
        },
      }),
    );

    const { result } = renderHook(() => useProjectFields("PVT_1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.fields).toEqual([
      { id: "F1", name: "Title", dataType: "TEXT", options: [] },
      { id: "F2", name: "Priority", dataType: "NUMBER", options: [] },
      { id: "F3", name: "Due Date", dataType: "DATE", options: [] },
    ]);
  });

  it("extracts options from SINGLE_SELECT fields", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          node: {
            fields: {
              nodes: [
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
              ],
            },
          },
        },
      }),
    );

    const { result } = renderHook(() => useProjectFields("PVT_1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.fields).toEqual([
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

  it("extracts iterations from ITERATION fields", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          node: {
            fields: {
              nodes: [
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
              ],
            },
          },
        },
      }),
    );

    const { result } = renderHook(() => useProjectFields("PVT_1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.fields).toEqual([
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

  it("filters out unsupported field types", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          node: {
            fields: {
              nodes: [
                { id: "F1", name: "Title", dataType: "TEXT" },
                { id: "F2", name: "Assignees", dataType: "ASSIGNEES" },
                { id: "F3", name: "Labels", dataType: "LABELS" },
                { id: "F4", name: "Milestone", dataType: "MILESTONE" },
                {
                  id: "F5",
                  name: "Status",
                  dataType: "SINGLE_SELECT",
                  options: [],
                },
              ],
            },
          },
        },
      }),
    );

    const { result } = renderHook(() => useProjectFields("PVT_1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.fields).toHaveLength(2);
    expect(result.current.fields[0].name).toBe("Title");
    expect(result.current.fields[1].name).toBe("Status");
  });

  it("handles ITERATION field without configuration", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          node: {
            fields: {
              nodes: [{ id: "F1", name: "Sprint", dataType: "ITERATION" }],
            },
          },
        },
      }),
    );

    const { result } = renderHook(() => useProjectFields("PVT_1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.fields).toEqual([
      { id: "F1", name: "Sprint", dataType: "ITERATION", options: [] },
    ]);
  });

  it("returns empty fields when projectId is empty", () => {
    const { result } = renderHook(() => useProjectFields(""));
    expect(result.current.fields).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
