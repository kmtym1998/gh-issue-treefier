import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { Dependency, Issue } from "../types/issue";
import { IssueGraph } from "./issue-graph";

const meta = {
  title: "Components/IssueGraph",
  component: IssueGraph,
  args: {
    projectId: "project-123",
    onEdgeAdd: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "800px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IssueGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

const issues: Issue[] = [
  {
    id: "owner/repo#1",
    number: 1,
    owner: "owner",
    repo: "repo",
    title: "Epic: Implement authentication",
    state: "open",
    body: "Top-level epic for auth.",
    labels: [{ name: "epic", color: "0075ca" }],
    assignees: [{ login: "alice", avatarUrl: "https://github.com/alice.png" }],
    url: "https://github.com/owner/repo/issues/1",
    fieldValues: {},
  },
  {
    id: "owner/repo#2",
    number: 2,
    owner: "owner",
    repo: "repo",
    title: "Design login page",
    state: "closed",
    body: "",
    labels: [{ name: "design", color: "e4e669" }],
    assignees: [],
    url: "https://github.com/owner/repo/issues/2",
    fieldValues: {},
  },
  {
    id: "owner/repo#3",
    number: 3,
    owner: "owner",
    repo: "repo",
    title: "Implement OAuth provider",
    state: "open",
    body: "",
    labels: [{ name: "backend", color: "d73a4a" }],
    assignees: [],
    url: "https://github.com/owner/repo/issues/3",
    fieldValues: {},
  },
  {
    id: "owner/repo#4",
    number: 4,
    owner: "owner",
    repo: "repo",
    title: "Add session management",
    state: "open",
    body: "",
    labels: [],
    assignees: [],
    url: "https://github.com/owner/repo/issues/4",
    fieldValues: {},
  },
  {
    id: "owner/repo#5",
    number: 5,
    owner: "owner",
    repo: "repo",
    title: "Write auth tests",
    state: "open",
    body: "",
    labels: [{ name: "testing", color: "a2eeef" }],
    assignees: [],
    url: "https://github.com/owner/repo/issues/5",
    fieldValues: {},
  },
];

const dependencies: Dependency[] = [
  { source: "owner/repo#1", target: "owner/repo#2", type: "sub_issue" },
  { source: "owner/repo#1", target: "owner/repo#3", type: "sub_issue" },
  { source: "owner/repo#1", target: "owner/repo#4", type: "sub_issue" },
  { source: "owner/repo#3", target: "owner/repo#5", type: "blocked_by" },
  { source: "owner/repo#4", target: "owner/repo#5", type: "blocked_by" },
];

export const Default: Story = {
  args: {
    issues,
    dependencies,
  },
};

export const Empty: Story = {
  args: {
    issues: [],
    dependencies: [],
  },
};

export const SingleNode: Story = {
  args: {
    issues: [issues[0]],
    dependencies: [],
  },
};

export const AllClosed: Story = {
  args: {
    issues: issues.map((i) => ({ ...i, state: "closed" as const })),
    dependencies,
  },
};

const multiRepoIssues: Issue[] = [
  {
    id: "org/frontend#1",
    number: 1,
    owner: "org",
    repo: "frontend",
    title: "Epic: Dashboard redesign",
    state: "open",
    body: "",
    labels: [{ name: "epic", color: "0075ca" }],
    assignees: [],
    url: "https://github.com/org/frontend/issues/1",
    fieldValues: {},
  },
  {
    id: "org/frontend#5",
    number: 5,
    owner: "org",
    repo: "frontend",
    title: "New chart components",
    state: "open",
    body: "",
    labels: [],
    assignees: [],
    url: "https://github.com/org/frontend/issues/5",
    fieldValues: {},
  },
  {
    id: "org/backend#10",
    number: 10,
    owner: "org",
    repo: "backend",
    title: "Metrics API endpoint",
    state: "open",
    body: "",
    labels: [{ name: "api", color: "d73a4a" }],
    assignees: [],
    url: "https://github.com/org/backend/issues/10",
    fieldValues: {},
  },
  {
    id: "org/infra#3",
    number: 3,
    owner: "org",
    repo: "infra",
    title: "Deploy monitoring stack",
    state: "closed",
    body: "",
    labels: [],
    assignees: [],
    url: "https://github.com/org/infra/issues/3",
    fieldValues: {},
  },
];

const multiRepoDeps: Dependency[] = [
  { source: "org/frontend#1", target: "org/frontend#5", type: "sub_issue" },
  { source: "org/frontend#1", target: "org/backend#10", type: "sub_issue" },
  { source: "org/backend#10", target: "org/infra#3", type: "blocked_by" },
];

export const MultiRepo: Story = {
  args: {
    issues: multiRepoIssues,
    dependencies: multiRepoDeps,
  },
};

const multiAssigneeIssues: Issue[] = [
  {
    id: "owner/repo#1",
    number: 1,
    owner: "owner",
    repo: "repo",
    title: "Epic: Platform migration",
    state: "open",
    body: "",
    labels: [{ name: "epic", color: "0075ca" }],
    assignees: [
      { login: "alice", avatarUrl: "https://github.com/alice.png" },
      { login: "bob", avatarUrl: "https://github.com/bob.png" },
      { login: "carol", avatarUrl: "https://github.com/carol.png" },
    ],
    url: "https://github.com/owner/repo/issues/1",
    fieldValues: {},
  },
  {
    id: "owner/repo#2",
    number: 2,
    owner: "owner",
    repo: "repo",
    title: "Migrate database schema",
    state: "open",
    body: "",
    labels: [{ name: "backend", color: "d73a4a" }],
    assignees: [
      { login: "alice", avatarUrl: "https://github.com/alice.png" },
      { login: "dave", avatarUrl: "https://github.com/dave.png" },
      { login: "eve", avatarUrl: "https://github.com/eve.png" },
      { login: "frank", avatarUrl: "https://github.com/frank.png" },
      { login: "grace", avatarUrl: "https://github.com/grace.png" },
    ],
    url: "https://github.com/owner/repo/issues/2",
    fieldValues: {},
  },
  {
    id: "owner/repo#3",
    number: 3,
    owner: "owner",
    repo: "repo",
    title: "Update frontend components",
    state: "closed",
    body: "",
    labels: [],
    assignees: [
      { login: "bob", avatarUrl: "https://github.com/bob.png" },
      { login: "carol", avatarUrl: "https://github.com/carol.png" },
    ],
    url: "https://github.com/owner/repo/issues/3",
    fieldValues: {},
  },
];

export const MultipleAssignees: Story = {
  args: {
    issues: multiAssigneeIssues,
    dependencies: [
      { source: "owner/repo#1", target: "owner/repo#2", type: "sub_issue" },
      { source: "owner/repo#1", target: "owner/repo#3", type: "sub_issue" },
    ],
  },
};
