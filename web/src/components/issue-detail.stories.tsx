import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
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
      id: "owner/repo#42",
      number: 42,
      owner: "owner",
      repo: "repo",
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
      fieldValues: {},
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText("owner/repo")).toBeDefined();
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
      id: "owner/repo#7",
      number: 7,
      owner: "owner",
      repo: "repo",
      title: "Fix login redirect bug",
      state: "closed",
      body: "Fixed in PR #8.",
      labels: [{ name: "bug", color: "d73a4a" }],
      assignees: [
        { login: "carol", avatarUrl: "https://github.com/carol.png" },
      ],
      url: "https://github.com/owner/repo/issues/7",
      fieldValues: {},
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
      id: "owner/repo#100",
      number: 100,
      owner: "owner",
      repo: "repo",
      title: "Simple task without labels",
      state: "open",
      body: "",
      labels: [],
      assignees: [],
      url: "https://github.com/owner/repo/issues/100",
      fieldValues: {},
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

export const WithAddSubIssueForm: Story = {
  args: {
    issue: {
      id: "owner/repo#42",
      number: 42,
      owner: "owner",
      repo: "repo",
      title: "Parent issue",
      state: "open",
      body: "",
      labels: [],
      assignees: [],
      url: "https://github.com/owner/repo/issues/42",
      fieldValues: {},
    },
    onAddSubIssue: fn(() => Promise.resolve()),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Form should be visible
    expect(canvas.getByText("Add Sub-Issue")).toBeDefined();

    // Submit button should be disabled when input is empty
    const submitButton = canvas.getByText("Add");
    expect(submitButton).toBeDisabled();

    // Type an issue number
    const input = canvas.getByPlaceholderText("Issue #");
    await userEvent.type(input, "10");

    // Submit button should now be enabled
    expect(submitButton).not.toBeDisabled();

    // Submit the form
    await userEvent.click(submitButton);

    // Callback should have been called
    expect(args.onAddSubIssue).toHaveBeenCalledWith("owner", "repo", 42, 10);

    // Input should be cleared after successful submission
    expect(input).toHaveValue("");
  },
};

export const WithoutAddSubIssueForm: Story = {
  args: {
    issue: {
      id: "owner/repo#42",
      number: 42,
      owner: "owner",
      repo: "repo",
      title: "Read-only issue",
      state: "open",
      body: "",
      labels: [],
      assignees: [],
      url: "https://github.com/owner/repo/issues/42",
      fieldValues: {},
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Form should NOT be visible when onAddSubIssue is not provided
    expect(canvas.queryByText("Add Sub-Issue")).toBeNull();
  },
};

export const CrossRepo: Story = {
  args: {
    issue: {
      id: "org/backend#15",
      number: 15,
      owner: "org",
      repo: "backend",
      title: "Add metrics API",
      state: "open",
      body: "New endpoint for dashboard metrics.",
      labels: [{ name: "api", color: "0075ca" }],
      assignees: [],
      url: "https://github.com/org/backend/issues/15",
      fieldValues: {},
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText("org/backend")).toBeDefined();
    expect(canvas.getByText("#15")).toBeDefined();
  },
};
