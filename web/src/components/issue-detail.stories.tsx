import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";
import { IssueDetail } from "./issue-detail";

const meta = {
  title: "Components/IssueDetail",
  component: IssueDetail,
  args: {
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div
        style={{ height: "400px", display: "flex", justifyContent: "flex-end" }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IssueDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    issue: {
      number: 42,
      title: "Implement user authentication",
      state: "open",
      body: "We need to add OAuth2 support for Google and GitHub providers.\n\nAcceptance criteria:\n- Users can sign in with Google\n- Users can sign in with GitHub",
      labels: [
        { name: "feature", color: "a2eeef" },
        { name: "priority:high", color: "d73a4a" },
      ],
      assignees: [
        { login: "alice", avatarUrl: "https://github.com/alice.png" },
        { login: "bob", avatarUrl: "https://github.com/bob.png" },
      ],
      url: "https://github.com/owner/repo/issues/42",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText("#42")).toBeDefined();
    expect(canvas.getByText(/Implement user authentication/)).toBeDefined();
    expect(canvas.getByText("open")).toBeDefined();
    expect(canvas.getByText("feature")).toBeDefined();
    expect(canvas.getByText("priority:high")).toBeDefined();
    expect(canvas.getByText("alice")).toBeDefined();
    expect(canvas.getByText("bob")).toBeDefined();
    expect(canvas.getByText(/OAuth2 support/)).toBeDefined();

    const link = canvas.getByText("View on GitHub");
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "https://github.com/owner/repo/issues/42",
    );
  },
};

export const Closed: Story = {
  args: {
    issue: {
      number: 7,
      title: "Fix login redirect bug",
      state: "closed",
      body: "Fixed in PR #8.",
      labels: [{ name: "bug", color: "d73a4a" }],
      assignees: [
        { login: "carol", avatarUrl: "https://github.com/carol.png" },
      ],
      url: "https://github.com/owner/repo/issues/7",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText("closed")).toBeDefined();
    expect(canvas.getByText("#7")).toBeDefined();
    expect(canvas.getByText("carol")).toBeDefined();
  },
};

export const NoLabels: Story = {
  args: {
    issue: {
      number: 100,
      title: "Simple task without labels",
      state: "open",
      body: "",
      labels: [],
      assignees: [],
      url: "https://github.com/owner/repo/issues/100",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText("#100")).toBeDefined();
    expect(canvas.queryByText("feature")).toBeNull();
  },
};

export const NullIssue: Story = {
  args: {
    issue: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.queryByText("View on GitHub")).toBeNull();
  },
};
