import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import { expect, userEvent, within } from "storybook/test";
import { IssueDashboard } from "./issue-dashboard";

const mockProjectItems = {
  data: {
    node: {
      items: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [
          {
            id: "PVTI_1",
            content: {
              number: 1,
              title: "Epic: Implement authentication",
              state: "OPEN",
              body: "Top-level epic for auth.",
              url: "https://github.com/octocat/hello-world/issues/1",
              repository: { owner: { login: "octocat" }, name: "hello-world" },
              labels: { nodes: [{ name: "epic", color: "0075ca" }] },
              assignees: {
                nodes: [
                  {
                    login: "alice",
                    avatarUrl: "https://github.com/alice.png",
                  },
                ],
              },
              subIssues: {
                nodes: [
                  {
                    number: 2,
                    repository: {
                      owner: { login: "octocat" },
                      name: "hello-world",
                    },
                  },
                  {
                    number: 3,
                    repository: {
                      owner: { login: "octocat" },
                      name: "hello-world",
                    },
                  },
                ],
              },
            },
            fieldValues: { nodes: [] },
          },
          {
            id: "PVTI_2",
            content: {
              number: 2,
              title: "Design login page",
              state: "CLOSED",
              body: "",
              url: "https://github.com/octocat/hello-world/issues/2",
              repository: { owner: { login: "octocat" }, name: "hello-world" },
              labels: { nodes: [{ name: "design", color: "e4e669" }] },
              assignees: { nodes: [] },
              subIssues: { nodes: [] },
            },
            fieldValues: { nodes: [] },
          },
          {
            id: "PVTI_3",
            content: {
              number: 3,
              title: "Implement OAuth provider",
              state: "OPEN",
              body: "OAuth2 integration.",
              url: "https://github.com/octocat/hello-world/issues/3",
              repository: { owner: { login: "octocat" }, name: "hello-world" },
              labels: { nodes: [{ name: "backend", color: "d73a4a" }] },
              assignees: { nodes: [] },
              subIssues: { nodes: [] },
            },
            fieldValues: { nodes: [] },
          },
        ],
      },
    },
  },
};

const mockProjects = {
  data: {
    user: {
      projectsV2: {
        nodes: [{ id: "PVT_1", title: "Sprint Board", number: 1 }],
      },
    },
  },
};

const mockFields = {
  data: {
    node: {
      fields: {
        nodes: [],
      },
    },
  },
};

const handlers = [
  http.post("/api/github/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string };
    if (body.query.includes("projectsV2")) {
      return HttpResponse.json(mockProjects);
    }
    if (body.query.includes("fields")) {
      return HttpResponse.json(mockFields);
    }
    if (body.query.includes("items")) {
      return HttpResponse.json(mockProjectItems);
    }
    return HttpResponse.json({ data: {} });
  }),
];

const emptyItemsResponse = {
  data: {
    node: {
      items: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [],
      },
    },
  },
};

const emptyHandlers = [
  http.post("/api/github/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string };
    if (body.query.includes("projectsV2")) {
      return HttpResponse.json(mockProjects);
    }
    if (body.query.includes("fields")) {
      return HttpResponse.json(mockFields);
    }
    if (body.query.includes("items")) {
      return HttpResponse.json(emptyItemsResponse);
    }
    return HttpResponse.json({ data: {} });
  }),
];

const errorHandlers = [
  http.post("/api/github/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string };
    if (body.query.includes("projectsV2")) {
      return HttpResponse.json(mockProjects);
    }
    if (body.query.includes("fields")) {
      return HttpResponse.json(mockFields);
    }
    if (body.query.includes("items")) {
      return HttpResponse.json({ message: "Not Found" }, { status: 404 });
    }
    return HttpResponse.json({ data: {} });
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

/** 初期状態: Owner/Project 未入力 */
export const Initial: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvas.getByText("Owner を入力し Project を選択して Issue を表示"),
    ).toBeDefined();
  },
};

/** Issue がグラフ表示される */
export const WithIssues: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText("Owner"), "octocat");

    // Wait for projects to load and select one
    const projectSelect = await canvas.findByLabelText("Project", undefined, {
      timeout: 3000,
    });
    await userEvent.selectOptions(projectSelect, "PVT_1");

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

    const projectSelect = await canvas.findByLabelText("Project", undefined, {
      timeout: 3000,
    });
    await userEvent.selectOptions(projectSelect, "PVT_1");

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

    const projectSelect = await canvas.findByLabelText("Project", undefined, {
      timeout: 3000,
    });
    await userEvent.selectOptions(projectSelect, "PVT_1");

    await expect(
      await canvas.findByText(/Error:/, undefined, { timeout: 3000 }),
    ).toBeDefined();
  },
};
