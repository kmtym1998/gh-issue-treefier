import { useEffect, useState } from "react";
import { restGet } from "../api-client";
import type { GitHubIssue, GitHubSubIssue } from "../types/github";
import type { Dependency, Issue } from "../types/issue";

export interface UseIssuesOptions {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
}

export interface UseIssuesResult {
  issues: Issue[];
  dependencies: Dependency[];
  loading: boolean;
  error: Error | null;
}

/**
 * GitHub REST API のレスポンスを内部の Issue 型に変換する。
 * pull_request フィールドを持つ項目（PR）は除外する。
 */
export function parseIssues(raw: GitHubIssue[]): Issue[] {
  return raw
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      state: i.state as "open" | "closed",
      body: i.body ?? "",
      labels: i.labels.map((l) => ({ name: l.name, color: l.color })),
      assignees: (i.assignees ?? []).map((a) => ({
        login: a.login,
        avatarUrl: a.avatar_url,
      })),
      url: i.html_url,
    }));
}

/**
 * Sub-Issues レスポンスから依存関係（親→子）のエッジ一覧を生成する。
 */
export function parseDependencies(subIssues: GitHubSubIssue[]): Dependency[] {
  return subIssues
    .filter((si) => si.parent != null)
    .map((si) => ({
      source: si.parent?.number as number,
      target: si.number,
    }));
}

export function useIssues(options: UseIssuesOptions): UseIssuesResult {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options.owner || !options.repo) return;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          per_page: "100",
          state: options.state ?? "open",
        });

        const rawIssues = await restGet<GitHubIssue[]>(
          `repos/${options.owner}/${options.repo}/issues?${params}`,
        );
        if (cancelled) return;

        const parsed = parseIssues(rawIssues);
        setIssues(parsed);

        // sub_issues_summary.total > 0 の issue から依存関係を取得
        const issuesWithSubs = rawIssues.filter(
          (i) => !i.pull_request && (i.sub_issues_summary?.total ?? 0) > 0,
        );

        const allDeps: Dependency[] = [];
        for (const issue of issuesWithSubs) {
          if (cancelled) return;
          const subs = await restGet<GitHubSubIssue[]>(
            `repos/${options.owner}/${options.repo}/issues/${issue.number}/sub_issues`,
          );
          allDeps.push(...parseDependencies(subs));
        }

        if (!cancelled) {
          setDependencies(allDeps);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [options.owner, options.repo, options.state]);

  return { issues, dependencies, loading, error };
}
