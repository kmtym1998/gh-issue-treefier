import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import { expect, userEvent, within } from "storybook/test";
import { IssueDashboard } from "./issue-dashboard";

const mockIssues = [
  {
    number: 1,
    title: "Epic: Implement authentication",
    state: "open",
    body: "Top-level epic for auth.",
    html_url: "https://github.com/octocat/hello-world/issues/1",
    labels: [{ name: "epic", color: "0075ca" }],
    assignees: [{ login: "alice", avatar_url: "https://github.com/alice.png" }],
    sub_issues_summary: { total: 2, completed: 1, percent_completed: 50 },
  },
  {
    number: 2,
    title: "Design login page",
    state: "closed",
    body: "",
    html_url: "https://github.com/octocat/hello-world/issues/2",
    labels: [{ name: "design", color: "e4e669" }],
    assignees: [],
  },
  {
    number: 3,
    title: "Implement OAuth provider",
    state: "open",
    body: "OAuth2 integration.",
    html_url: "https://github.com/octocat/hello-world/issues/3",
    labels: [{ name: "backend", color: "d73a4a" }],
    assignees: [],
  },
];

const mockSubIssues = [
  {
    number: 2,
    title: "Design login page",
    state: "closed",
    html_url: "https://github.com/octocat/hello-world/issues/2",
    parent: { number: 1 },
  },
  {
    number: 3,
    title: "Implement OAuth provider",
    state: "open",
    html_url: "https://github.com/octocat/hello-world/issues/3",
    parent: { number: 1 },
  },
];

const mockProjects = {
  data: {
    user: {
      projectsV2: {
        nodes: [{ id: "PVT_1", title: "Sprint Board", number: 1 }],
      },
    },
  },
};

const handlers = [
  http.get("/api/github/rest/repos/:owner/:repo/issues", () => {
    return HttpResponse.json(mockIssues);
  }),
  http.get(
    "/api/github/rest/repos/:owner/:repo/issues/:number/sub_issues",
    () => {
      return HttpResponse.json(mockSubIssues);
    },
  ),
  http.post("/api/github/graphql", () => {
    return HttpResponse.json(mockProjects);
  }),
];

const emptyHandlers = [
  http.get("/api/github/rest/repos/:owner/:repo/issues", () => {
    return HttpResponse.json([]);
  }),
  http.post("/api/github/graphql", () => {
    return HttpResponse.json(mockProjects);
  }),
];

const errorHandlers = [
  http.get("/api/github/rest/repos/:owner/:repo/issues", () => {
    return HttpResponse.json({ message: "Not Found" }, { status: 404 });
  }),
  http.post("/api/github/graphql", () => {
    return HttpResponse.json(mockProjects);
  }),
];

const meta = {
  title: "Components/IssueDashboard",
  component: IssueDashboard,
  parameters: {
    msw: { handlers },
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IssueDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 初期状態: Owner/Repo 未入力 */
export const Initial: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvas.getByText("Owner と Repo を入力して Issue を表示"),
    ).toBeDefined();
  },
};

/** Issue がグラフ表示される */
export const WithIssues: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText("Owner"), "octocat");
    await userEvent.type(canvas.getByLabelText("Repo"), "hello-world");

    // グラフが描画されるまで待機
    await expect(
      await canvas.findByText(/Epic: Implement authentication/, undefined, {
        timeout: 3000,
      }),
    ).toBeDefined();
  },
};

/** Issue が 0 件 */
export const EmptyResult: Story = {
  parameters: {
    msw: { handlers: emptyHandlers },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText("Owner"), "octocat");
    await userEvent.type(canvas.getByLabelText("Repo"), "empty-repo");

    await expect(
      await canvas.findByText("Issue が見つかりませんでした", undefined, {
        timeout: 3000,
      }),
    ).toBeDefined();
  },
};

/** API エラー */
export const ErrorState: Story = {
  parameters: {
    msw: { handlers: errorHandlers },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText("Owner"), "octocat");
    await userEvent.type(canvas.getByLabelText("Repo"), "not-found");

    await expect(
      await canvas.findByText(/Error:/, undefined, { timeout: 3000 }),
    ).toBeDefined();
  },
};
