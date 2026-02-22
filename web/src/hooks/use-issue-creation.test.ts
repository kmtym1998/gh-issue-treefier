// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIssueCreation } from "./use-issue-creation";

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

describe("useIssueCreation", () => {
  describe("createIssue", () => {
    it("POSTs to issues endpoint and returns created issue", async () => {
      const created = {
        id: 42,
        node_id: "I_node42",
        number: 10,
        title: "Test issue",
        html_url: "https://github.com/owner/repo/issues/10",
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(created, 201, "Created"));

      const { result } = renderHook(() => useIssueCreation());

      let issue:
        | Awaited<ReturnType<typeof result.current.createIssue>>
        | undefined;
      await act(async () => {
        issue = await result.current.createIssue({
          owner: "owner",
          repo: "repo",
          title: "Test issue",
          body: "Description",
          assignees: ["alice"],
        });
      });

      expect(issue).toEqual(created);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("/api/github/rest/repos/owner/repo/issues");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({
        title: "Test issue",
        body: "Description",
        assignees: ["alice"],
      });
    });

    it("sets error when API returns error", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          { message: "Validation Failed" },
          422,
          "Unprocessable Entity",
        ),
      );

      const { result } = renderHook(() => useIssueCreation());

      await act(async () => {
        await result.current
          .createIssue({ owner: "owner", repo: "repo", title: "" })
          .catch(() => {});
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("fetchTemplates", () => {
    it("returns templates from GraphQL response", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: {
            repository: {
              issueTemplates: [
                {
                  name: "Bug",
                  title: "Bug:",
                  body: "Steps...",
                  about: "Report",
                },
                {
                  name: "Feature",
                  title: "Feat:",
                  body: "Desc...",
                  about: "Request",
                },
              ],
            },
          },
        }),
      );

      const { result } = renderHook(() => useIssueCreation());

      let templates:
        | Awaited<ReturnType<typeof result.current.fetchTemplates>>
        | undefined;
      await act(async () => {
        templates = await result.current.fetchTemplates("owner", "repo");
      });

      expect(templates).toEqual([
        { name: "Bug", title: "Bug:", body: "Steps..." },
        { name: "Feature", title: "Feat:", body: "Desc..." },
      ]);
    });

    it("returns empty array when no templates exist", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: { repository: { issueTemplates: [] } },
        }),
      );

      const { result } = renderHook(() => useIssueCreation());

      let templates:
        | Awaited<ReturnType<typeof result.current.fetchTemplates>>
        | undefined;
      await act(async () => {
        templates = await result.current.fetchTemplates("owner", "repo");
      });

      expect(templates).toEqual([]);
    });

    it("returns empty array on API error", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ message: "Not Found" }, 404, "Not Found"),
      );

      const { result } = renderHook(() => useIssueCreation());

      let templates:
        | Awaited<ReturnType<typeof result.current.fetchTemplates>>
        | undefined;
      await act(async () => {
        templates = await result.current.fetchTemplates("owner", "repo");
      });

      expect(templates).toEqual([]);
    });
  });

  describe("fetchCollaborators", () => {
    it("returns collaborators with mapped field names", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse([
          { login: "alice", avatar_url: "https://github.com/alice.png" },
          { login: "bob", avatar_url: "https://github.com/bob.png" },
        ]),
      );

      const { result } = renderHook(() => useIssueCreation());

      let collaborators:
        | Awaited<ReturnType<typeof result.current.fetchCollaborators>>
        | undefined;
      await act(async () => {
        collaborators = await result.current.fetchCollaborators(
          "owner",
          "repo",
        );
      });

      expect(collaborators).toEqual([
        { login: "alice", avatarUrl: "https://github.com/alice.png" },
        { login: "bob", avatarUrl: "https://github.com/bob.png" },
      ]);
    });

    it("returns empty array on API error", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ message: "Forbidden" }, 403, "Forbidden"),
      );

      const { result } = renderHook(() => useIssueCreation());

      let collaborators:
        | Awaited<ReturnType<typeof result.current.fetchCollaborators>>
        | undefined;
      await act(async () => {
        collaborators = await result.current.fetchCollaborators(
          "owner",
          "repo",
        );
      });

      expect(collaborators).toEqual([]);
    });
  });
});
