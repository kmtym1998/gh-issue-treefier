// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectMutations } from "./use-project-mutations";

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

describe("useProjectMutations", () => {
  describe("addToProject", () => {
    it("calls addProjectV2ItemById mutation and returns item ID", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: { addProjectV2ItemById: { item: { id: "PVTI_123" } } },
        }),
      );

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useProjectMutations(onSuccess));

      let itemId = "";
      await act(async () => {
        itemId = await result.current.addToProject("PVT_1", "I_node123");
      });

      expect(itemId).toBe("PVTI_123");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(onSuccess).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("/api/github/graphql");
      expect(options.method).toBe("POST");
      const body = JSON.parse(options.body);
      expect(body.variables).toEqual({
        projectId: "PVT_1",
        contentId: "I_node123",
      });
    });

    it("sets error when mutation fails", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ message: "Not Found" }, 404, "Not Found"),
      );

      const { result } = renderHook(() => useProjectMutations());

      await act(async () => {
        await result.current.addToProject("PVT_1", "I_bad").catch(() => {});
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("updateFieldValue", () => {
    it("calls mutation for SINGLE_SELECT", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: {
            updateProjectV2ItemFieldValue: {
              projectV2Item: { id: "PVTI_123" },
            },
          },
        }),
      );

      const { result } = renderHook(() => useProjectMutations());

      await act(async () => {
        await result.current.updateFieldValue("PVT_1", "PVTI_123", "F1", {
          singleSelectOptionId: "OPT_1",
        });
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables).toEqual({
        projectId: "PVT_1",
        itemId: "PVTI_123",
        fieldId: "F1",
        value: { singleSelectOptionId: "OPT_1" },
      });
    });

    it("calls mutation for ITERATION", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: {
            updateProjectV2ItemFieldValue: {
              projectV2Item: { id: "PVTI_123" },
            },
          },
        }),
      );

      const { result } = renderHook(() => useProjectMutations());

      await act(async () => {
        await result.current.updateFieldValue("PVT_1", "PVTI_123", "F2", {
          iterationId: "ITER_1",
        });
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.value).toEqual({ iterationId: "ITER_1" });
    });

    it("sets error when mutation fails", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ message: "Forbidden" }, 403, "Forbidden"),
      );

      const { result } = renderHook(() => useProjectMutations());

      await act(async () => {
        await result.current
          .updateFieldValue("PVT_1", "PVTI_1", "F1", {
            singleSelectOptionId: "OPT_1",
          })
          .catch(() => {});
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });
});
