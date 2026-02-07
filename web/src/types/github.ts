/** GitHub REST API の Issue レスポンス */
export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  body: string | null;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  assignees: Array<{ login: string; avatar_url: string }>;
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

/** GitHub GraphQL ProjectV2 ノード */
export interface GitHubProjectV2Node {
  id: string;
  title: string;
  number: number;
}

/** GitHub GraphQL ProjectV2 フィールドノード（union 型の共通部分） */
export interface GitHubProjectV2FieldNode {
  id: string;
  name: string;
  dataType: string;
  options?: Array<{ id: string; name: string }>;
  configuration?: {
    iterations?: Array<{ id: string; title: string }>;
  };
}
