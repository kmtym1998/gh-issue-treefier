/** GitHub GraphQL ProjectV2 ノード */
export interface GitHubProjectV2Node {
  id: string;
  title: string;
  number: number;
}

/** GitHub GraphQL ProjectV2 Item (Issue content) */
export interface GitHubProjectV2Item {
  id: string;
  content: {
    number: number;
    title: string;
    state: string;
    body: string | null;
    url: string;
    repository: { owner: { login: string }; name: string };
    labels: { nodes: Array<{ name: string; color: string }> };
    assignees: { nodes: Array<{ login: string; avatarUrl: string }> };
    subIssues: {
      nodes: Array<{
        number: number;
        repository: { owner: { login: string }; name: string };
      }>;
    };
    blockedBy: {
      nodes: Array<{
        number: number;
        repository: { owner: { login: string }; name: string };
      }>;
    };
    blocking: {
      nodes: Array<{
        number: number;
        repository: { owner: { login: string }; name: string };
      }>;
    };
  } | null;
  fieldValues: {
    nodes: Array<{
      field?: { id: string };
      optionId?: string;
      iterationId?: string;
    }>;
  };
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
