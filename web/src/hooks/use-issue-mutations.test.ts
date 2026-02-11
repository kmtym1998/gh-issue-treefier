import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addBlockedBy,
  addSubIssue,
  removeBlockedBy,
  removeSubIssue,
} from "./use-issue-mutations";

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
  it("fetches node IDs for both issues then calls GraphQL mutation", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 100, node_id: "I_parent" }),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 200, node_id: "I_child" }),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: { removeSubIssue: { issue: { id: "I_parent" } } } }),
    );

    await removeSubIssue("owner", "repo", 10, 20);

    const restCalls = mockFetch.mock.calls.slice(0, 2).map((c) => c[0]);
    expect(restCalls).toContain("/api/github/rest/repos/owner/repo/issues/10");
    expect(restCalls).toContain("/api/github/rest/repos/owner/repo/issues/20");

    const [url, options] = mockFetch.mock.calls[2];
    expect(url).toBe("/api/github/graphql");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.variables).toEqual({
      issueId: "I_parent",
      subIssueId: "I_child",
    });
  });

  it("throws when child issue lookup fails", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 100, node_id: "I_parent" }),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Not Found" }, 404, "Not Found"),
    );

    await expect(removeSubIssue("owner", "repo", 10, 999)).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("addBlockedBy", () => {
  it("fetches node IDs for both issues then calls GraphQL mutation", async () => {
    // 1st & 2nd calls: GET node_ids (parallel)
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 100, node_id: "I_issue1" }),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 200, node_id: "I_blocker1" }),
    );
    // 3rd call: GraphQL mutation
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: { addBlockedBy: { issue: { id: "I_issue1" } } } }),
    );

    await addBlockedBy("owner", "repo", 5, 3);

    // Verify GET requests for both issues (parallel, order may vary)
    const restCalls = mockFetch.mock.calls.slice(0, 2).map((c) => c[0]);
    expect(restCalls).toContain("/api/github/rest/repos/owner/repo/issues/5");
    expect(restCalls).toContain("/api/github/rest/repos/owner/repo/issues/3");

    // Verify GraphQL mutation
    const [url, options] = mockFetch.mock.calls[2];
    expect(url).toBe("/api/github/graphql");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.variables).toEqual({
      issueId: "I_issue1",
      blockingIssueId: "I_blocker1",
    });
  });

  it("throws when issue lookup fails", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Not Found" }, 404, "Not Found"),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 200, node_id: "I_blocker1" }),
    );

    await expect(addBlockedBy("owner", "repo", 999, 3)).rejects.toThrow();
  });
});

describe("removeBlockedBy", () => {
  it("fetches node IDs for both issues then calls GraphQL mutation", async () => {
    // 1st & 2nd calls: GET node_ids (parallel)
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 100, node_id: "I_issue1" }),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 200, node_id: "I_blocker1" }),
    );
    // 3rd call: GraphQL mutation
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: { removeBlockedBy: { issue: { id: "I_issue1" } } },
      }),
    );

    await removeBlockedBy("owner", "repo", 5, 3);

    // Verify GET requests for both issues
    const restCalls = mockFetch.mock.calls.slice(0, 2).map((c) => c[0]);
    expect(restCalls).toContain("/api/github/rest/repos/owner/repo/issues/5");
    expect(restCalls).toContain("/api/github/rest/repos/owner/repo/issues/3");

    // Verify GraphQL mutation
    const [url, options] = mockFetch.mock.calls[2];
    expect(url).toBe("/api/github/graphql");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.variables).toEqual({
      issueId: "I_issue1",
      blockingIssueId: "I_blocker1",
    });
  });

  it("throws when issue lookup fails", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Not Found" }, 404, "Not Found"),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 200, node_id: "I_blocker1" }),
    );

    await expect(removeBlockedBy("owner", "repo", 999, 3)).rejects.toThrow();
  });
});
