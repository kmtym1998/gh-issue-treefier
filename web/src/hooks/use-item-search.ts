import { useCallback, useRef, useState } from "react";
import { restGet } from "../api-client";
import type { SearchResult } from "../types/issue";

interface GitHubSearchResponse {
  total_count: number;
  items: Array<{
    number: number;
    title: string;
    state: string;
    node_id: string;
    pull_request?: unknown;
    repository_url: string;
  }>;
}

const parseRepoUrl = (repoUrl: string): { owner: string; repo: string } => {
  // "https://api.github.com/repos/owner/repo" → owner, repo
  const parts = repoUrl.split("/");
  return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
};

export interface UseItemSearchResult {
  results: SearchResult[];
  search: (query: string, owner: string, type: "issue" | "pr") => void;
  loading: boolean;
  error: Error | null;
}

const DEBOUNCE_MS = 300;

export const useItemSearch = (): UseItemSearchResult => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    (query: string, owner: string, type: "issue" | "pr") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();

      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      timerRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const typeFilter = type === "pr" ? "pr" : "issue";
          const q = encodeURIComponent(
            `${query} user:${owner} type:${typeFilter}`,
          );
          const data = await restGet<GitHubSearchResponse>(
            `search/issues?q=${q}`,
          );

          if (controller.signal.aborted) return;

          setResults(
            data.items.map((item) => {
              const { owner: repoOwner, repo } = parseRepoUrl(
                item.repository_url,
              );
              return {
                number: item.number,
                title: item.title,
                state: item.state === "open" ? "open" : "closed",
                owner: repoOwner,
                repo,
                nodeId: item.node_id,
                isPullRequest: !!item.pull_request,
              };
            }),
          );
          setError(null);
        } catch (err) {
          if (controller.signal.aborted) return;
          const e = err instanceof Error ? err : new Error(String(err));
          setError(e);
          setResults([]);
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    [],
  );

  return { results, search, loading, error };
};
