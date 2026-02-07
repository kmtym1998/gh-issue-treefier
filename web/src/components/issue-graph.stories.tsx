import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Dependency, Issue } from "../types/issue";
import { IssueGraph } from "./issue-graph";

const meta = {
  title: "Components/IssueGraph",
  component: IssueGraph,
  decorators: [
    (Story) => (
      <div style={{ width: "800px", height: "500px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IssueGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

const issues: Issue[] = [
  {
    number: 1,
    title: "Epic: Implement authentication",
    state: "open",
    labels: [{ name: "epic", color: "0075ca" }],
    url: "https://github.com/owner/repo/issues/1",
  },
  {
    number: 2,
    title: "Design login page",
    state: "closed",
    labels: [{ name: "design", color: "e4e669" }],
    url: "https://github.com/owner/repo/issues/2",
  },
  {
    number: 3,
    title: "Implement OAuth provider",
    state: "open",
    labels: [{ name: "backend", color: "d73a4a" }],
    url: "https://github.com/owner/repo/issues/3",
  },
  {
    number: 4,
    title: "Add session management",
    state: "open",
    labels: [],
    url: "https://github.com/owner/repo/issues/4",
  },
  {
    number: 5,
    title: "Write auth tests",
    state: "open",
    labels: [{ name: "testing", color: "a2eeef" }],
    url: "https://github.com/owner/repo/issues/5",
  },
];

const dependencies: Dependency[] = [
  { source: 1, target: 2 },
  { source: 1, target: 3 },
  { source: 1, target: 4 },
  { source: 3, target: 5 },
  { source: 4, target: 5 },
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
