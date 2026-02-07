/** GitHub REST API の Issue レスポンス */
export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  pull_request?: unknown;
  sub_issues_summary?: {
    total: number;
    completed: number;
    percent_completed: number;
  };
}

/** GitHub REST API の Sub-Issue レスポンス */
export interface GitHubSubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  parent?: { number: number };
}
