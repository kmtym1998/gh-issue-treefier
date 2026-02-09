import { beforeEach, describe, expect, it, vi } from "vitest";
import { addSubIssue, removeSubIssue } from "./use-issue-mutations";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function jsonResponse(body: unknown, status = 200, statusText = "OK") {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
}

describe("addSubIssue", () => {
  it("fetches child issue ID then POSTs to sub_issues endpoint", async () => {
    // 1st call: GET child issue to resolve ID
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 42 }));
    // 2nd call: POST to add sub-issue
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }, 201, "Created"));

    await addSubIssue("owner", "repo", 10, 20);

    // Verify GET request for child issue
    expect(mockFetch.mock.calls[0][0]).toBe(
      "/api/github/rest/repos/owner/repo/issues/20",
    );

    // Verify POST request
    const [url, options] = mockFetch.mock.calls[1];
    expect(url).toBe("/api/github/rest/repos/owner/repo/issues/10/sub_issues");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ sub_issue_id: 42 });
  });

  it("throws when child issue lookup fails", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Not Found" }, 404, "Not Found"),
    );

    await expect(addSubIssue("owner", "repo", 10, 999)).rejects.toThrow();
    // POST should not be called
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("removeSubIssue", () => {
  it("fetches child issue ID then DELETEs from sub_issues endpoint", async () => {
    // 1st call: GET child issue to resolve ID
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 42 }));
    // 2nd call: DELETE sub-issue
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 200, "OK"));

    await removeSubIssue("owner", "repo", 10, 20);

    // Verify GET request for child issue
    expect(mockFetch.mock.calls[0][0]).toBe(
      "/api/github/rest/repos/owner/repo/issues/20",
    );

    // Verify DELETE request
    const [url, options] = mockFetch.mock.calls[1];
    expect(url).toBe(
      "/api/github/rest/repos/owner/repo/issues/10/sub_issues/42",
    );
    expect(options.method).toBe("DELETE");
  });

  it("throws when child issue lookup fails", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Not Found" }, 404, "Not Found"),
    );

    await expect(removeSubIssue("owner", "repo", 10, 999)).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
