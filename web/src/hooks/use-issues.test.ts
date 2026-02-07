import { describe, expect, it } from "vitest";
import type { GitHubIssue, GitHubSubIssue } from "../types/github";
import { parseDependencies, parseIssues } from "./use-issues";

describe("parseIssues", () => {
  it("converts GitHub issues to internal format", () => {
    const raw: GitHubIssue[] = [
      {
        number: 1,
        title: "Bug fix",
        state: "open",
        html_url: "https://github.com/owner/repo/issues/1",
        labels: [{ name: "bug", color: "d73a4a" }],
      },
      {
        number: 2,
        title: "Feature",
        state: "closed",
        html_url: "https://github.com/owner/repo/issues/2",
        labels: [],
      },
    ];

    const result = parseIssues(raw);

    expect(result).toEqual([
      {
        number: 1,
        title: "Bug fix",
        state: "open",
        labels: [{ name: "bug", color: "d73a4a" }],
        url: "https://github.com/owner/repo/issues/1",
      },
      {
        number: 2,
        title: "Feature",
        state: "closed",
        labels: [],
        url: "https://github.com/owner/repo/issues/2",
      },
    ]);
  });

  it("filters out pull requests", () => {
    const raw: GitHubIssue[] = [
      {
        number: 1,
        title: "Issue",
        state: "open",
        html_url: "https://github.com/owner/repo/issues/1",
        labels: [],
      },
      {
        number: 2,
        title: "PR",
        state: "open",
        html_url: "https://github.com/owner/repo/pull/2",
        labels: [],
        pull_request: {
          url: "https://api.github.com/repos/owner/repo/pulls/2",
        },
      },
    ];

    const result = parseIssues(raw);

    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
  });

  it("returns empty array for empty input", () => {
    expect(parseIssues([])).toEqual([]);
  });
});

describe("parseDependencies", () => {
  it("converts sub-issues to dependency edges", () => {
    const subs: GitHubSubIssue[] = [
      {
        number: 10,
        title: "Child 1",
        state: "open",
        html_url: "https://github.com/owner/repo/issues/10",
        parent: { number: 1 },
      },
      {
        number: 11,
        title: "Child 2",
        state: "closed",
        html_url: "https://github.com/owner/repo/issues/11",
        parent: { number: 1 },
      },
    ];

    const result = parseDependencies(subs);

    expect(result).toEqual([
      { source: 1, target: 10 },
      { source: 1, target: 11 },
    ]);
  });

  it("skips sub-issues without parent", () => {
    const subs: GitHubSubIssue[] = [
      {
        number: 10,
        title: "Orphan",
        state: "open",
        html_url: "https://github.com/owner/repo/issues/10",
      },
      {
        number: 11,
        title: "With parent",
        state: "open",
        html_url: "https://github.com/owner/repo/issues/11",
        parent: { number: 5 },
      },
    ];

    const result = parseDependencies(subs);

    expect(result).toEqual([{ source: 5, target: 11 }]);
  });

  it("returns empty array for empty input", () => {
    expect(parseDependencies([])).toEqual([]);
  });
});
