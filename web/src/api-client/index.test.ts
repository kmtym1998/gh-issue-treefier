import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError, graphql, restGet, restPost } from "./index";

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

async function catchAPIError(p: Promise<unknown>): Promise<APIError> {
  const err = await p.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(APIError);
  return err as APIError;
}

describe("restGet", () => {
  it("sends GET request and returns JSON", async () => {
    const data = { full_name: "owner/repo" };
    mockFetch.mockResolvedValue(jsonResponse(data));

    const result = await restGet("repos/owner/repo");

    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/github/rest/repos/owner/repo",
      undefined,
    );
  });

  it("throws APIError on 404", async () => {
    const body = { message: "Not Found" };
    mockFetch.mockResolvedValue(jsonResponse(body, 404, "Not Found"));

    const err = await catchAPIError(restGet("repos/owner/nonexistent"));

    expect(err.status).toBe(404);
    expect(err.body).toEqual(body);
  });
});

describe("restPost", () => {
  it("sends POST request with JSON body", async () => {
    const data = { id: 1, title: "new issue" };
    mockFetch.mockResolvedValue(jsonResponse(data, 201, "Created"));

    const result = await restPost("repos/owner/repo/issues", {
      title: "new issue",
    });

    expect(result).toEqual(data);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/github/rest/repos/owner/repo/issues");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ title: "new issue" });
  });
});

describe("graphql", () => {
  it("sends POST request to /api/github/graphql", async () => {
    const data = { data: { viewer: { login: "user" } } };
    mockFetch.mockResolvedValue(jsonResponse(data));

    const result = await graphql("{ viewer { login } }");

    expect(result).toEqual(data);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/github/graphql");
    expect(JSON.parse(options.body)).toEqual({
      query: "{ viewer { login } }",
    });
  });

  it("forwards variables", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: {} }));

    await graphql("query($owner: String!) { }", { owner: "test" });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.variables).toEqual({ owner: "test" });
  });
});

describe("error handling", () => {
  it("throws APIError on 401", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ message: "Bad credentials" }, 401, "Unauthorized"),
    );

    const err = await catchAPIError(restGet("user"));

    expect(err.status).toBe(401);
    expect(err.statusText).toBe("Unauthorized");
  });

  it("throws APIError on 500", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        { message: "Internal Server Error" },
        500,
        "Internal Server Error",
      ),
    );

    const err = await catchAPIError(graphql("{ viewer { login } }"));

    expect(err.status).toBe(500);
  });

  it("handles non-JSON error bodies", async () => {
    mockFetch.mockResolvedValue(
      new Response("gateway timeout", {
        status: 502,
        statusText: "Bad Gateway",
      }),
    );

    const err = await catchAPIError(restGet("repos/owner/repo"));

    expect(err.status).toBe(502);
    expect(err.body).toBe("gateway timeout");
  });

  it("propagates network errors", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    await expect(restGet("repos/owner/repo")).rejects.toThrow("fetch failed");
  });
});
