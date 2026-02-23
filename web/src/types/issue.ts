export interface Issue {
  id: string; // "owner/repo#number" 形式の複合 ID
  itemId?: string; // ProjectV2 item ID (PVTI_...)
  number: number;
  owner: string;
  repo: string;
  title: string;
  state: "open" | "closed";
  body: string;
  labels: Label[];
  assignees: Assignee[];
  url: string;
  /** プロジェクトフィールドの値。fieldId → optionId/iterationId のマップ */
  fieldValues: Record<string, string>;
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

/** Issue テンプレート */
export interface IssueTemplate {
  name: string;
  title: string;
  body: string;
}

/** Issue 作成パラメータ */
export interface CreateIssueParams {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  assignees?: string[];
}

/** プロジェクトフィールド値の設定パラメータ */
export interface ProjectFieldUpdate {
  fieldId: string;
  value: { singleSelectOptionId: string } | { iterationId: string };
}

/** 検索結果 */
export interface SearchResult {
  number: number;
  title: string;
  state: "open" | "closed";
  owner: string;
  repo: string;
  nodeId: string;
  isPullRequest: boolean;
}

/** コンテキストメニューの状態 */
export interface PaneContextMenuState {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
}
