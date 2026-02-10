export interface Issue {
  id: string; // "owner/repo#number" 形式の複合 ID
  number: number;
  owner: string;
  repo: string;
  title: string;
  state: "open" | "closed";
  body: string;
  labels: Label[];
  assignees: Assignee[];
  url: string;
}

export interface Assignee {
  login: string;
  avatarUrl: string;
}

export interface Label {
  name: string;
  color: string;
}

export type DependencyType = "sub_issue" | "blocked_by";

/** DAG のエッジ。source が target をブロックしている関係。複合 ID (owner/repo#number) を使用。 */
export interface Dependency {
  source: string;
  target: string;
  type: DependencyType;
}
