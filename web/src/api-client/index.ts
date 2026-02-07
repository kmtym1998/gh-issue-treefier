export class APIError extends Error {
  status: number;
  statusText: string;
  body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    super(`${status} ${statusText}`);
    this.name = "APIError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // keep as text
    }
    throw new APIError(response.status, response.statusText, body);
  }

  return response.json() as Promise<T>;
}

export function restGet<T = unknown>(path: string): Promise<T> {
  return request<T>(`/api/github/rest/${path}`);
}

export function restPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return request<T>(`/api/github/rest/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function graphql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  return request<T>("/api/github/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
}
