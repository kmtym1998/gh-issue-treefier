import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import { fn } from "storybook/test";
import { ItemSearchForm } from "./item-search-form";

const mockIssueResults = {
  total_count: 3,
  items: [
    {
      number: 10,
      title: "Fix login bug",
      state: "open",
      node_id: "I_kwDO10",
      repository_url: "https://api.github.com/repos/octocat/hello-world",
    },
    {
      number: 11,
      title: "Update documentation",
      state: "closed",
      node_id: "I_kwDO11",
      repository_url: "https://api.github.com/repos/octocat/hello-world",
    },
    {
      number: 12,
      title: "Add dark mode support",
      state: "open",
      node_id: "I_kwDO12",
      repository_url: "https://api.github.com/repos/octocat/linguist",
    },
  ],
};

const mockPRResults = {
  total_count: 2,
  items: [
    {
      number: 20,
      title: "feat: add OAuth support",
      state: "open",
      node_id: "PR_kwDO20",
      pull_request: {
        url: "https://api.github.com/repos/octocat/hello-world/pulls/20",
      },
      repository_url: "https://api.github.com/repos/octocat/hello-world",
    },
    {
      number: 21,
      title: "chore: update dependencies",
      state: "closed",
      node_id: "PR_kwDO21",
      pull_request: {
        url: "https://api.github.com/repos/octocat/hello-world/pulls/21",
      },
      repository_url: "https://api.github.com/repos/octocat/hello-world",
    },
  ],
};

const mockAddProject = {
  data: {
    addProjectV2ItemById: {
      item: { id: "PVTI_new" },
    },
  },
};

const issueHandlers = [
  http.get("/api/github/rest/search/issues", () =>
    HttpResponse.json(mockIssueResults),
  ),
  http.post("/api/github/graphql", () => HttpResponse.json(mockAddProject)),
];

const prHandlers = [
  http.get("/api/github/rest/search/issues", () =>
    HttpResponse.json(mockPRResults),
  ),
  http.post("/api/github/graphql", () => HttpResponse.json(mockAddProject)),
];

const emptyHandlers = [
  http.get("/api/github/rest/search/issues", () =>
    HttpResponse.json({ total_count: 0, items: [] }),
  ),
  http.post("/api/github/graphql", () => HttpResponse.json(mockAddProject)),
];

const errorHandlers = [
  http.get("/api/github/rest/search/issues", () =>
    HttpResponse.json(
      { message: "API rate limit exceeded" },
      { status: 403, statusText: "Forbidden" },
    ),
  ),
  http.post("/api/github/graphql", () => HttpResponse.json(mockAddProject)),
];

const meta = {
  title: "Components/ItemSearchForm",
  component: ItemSearchForm,
  args: {
    owner: "octocat",
    projectId: "PVT_1",
    onSuccess: fn(),
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
} satisfies Meta<typeof ItemSearchForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Issue 検索モード（結果あり） */
export const IssueMode: Story = {
  args: { type: "issue" },
  parameters: {
    msw: { handlers: issueHandlers },
  },
};

/** PR 検索モード（結果あり） */
export const PRMode: Story = {
  args: { type: "pr" },
  parameters: {
    msw: { handlers: prHandlers },
  },
};

/** 検索結果なし */
export const EmptyResults: Story = {
  args: { type: "issue" },
  parameters: {
    msw: { handlers: emptyHandlers },
  },
};

/** 検索 API エラー */
export const SearchError: Story = {
  args: { type: "issue" },
  parameters: {
    msw: { handlers: errorHandlers },
  },
};
