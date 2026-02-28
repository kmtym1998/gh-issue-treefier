import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { IssueDashboard } from "./issue-dashboard";

// TODO: mockProjects, mockCollaborators, mockCreatedIssue, mockAddProject などの
// モックデータが issue-create-form.stories.tsx, item-search-form.stories.tsx,
// filter-panel.stories.tsx と重複している。
// __mocks__/fixtures.ts と __mocks__/handlers.ts に共通化すべき。
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
              blockedBy: { nodes: [] },
              blocking: { nodes: [] },
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
              blockedBy: { nodes: [] },
              blocking: { nodes: [] },
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
              blockedBy: { nodes: [] },
              blocking: { nodes: [] },
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

const mockCollaborators = [
  { login: "alice", avatar_url: "https://github.com/alice.png" },
  { login: "bob", avatar_url: "https://github.com/bob.png" },
];

const mockCreatedIssue = {
  id: 99,
  node_id: "I_kwDO99",
  number: 99,
  title: "New Issue",
  html_url: "https://github.com/octocat/hello-world/issues/99",
};

const mockAddProject = {
  data: { addProjectV2ItemById: { item: { id: "PVTI_new" } } },
};

const mockSearchResults = {
  total_count: 2,
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
  ],
};

const restHandlers = [
  http.get("/api/github/rest/repos/:owner/:repo/collaborators", () =>
    HttpResponse.json(mockCollaborators),
  ),
  http.post("/api/github/rest/repos/:owner/:repo/issues", () =>
    HttpResponse.json(mockCreatedIssue, { status: 201 }),
  ),
  http.get("/api/github/rest/search/issues", () =>
    HttpResponse.json(mockSearchResults),
  ),
];

const handlers = [
  ...restHandlers,
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
    if (body.query.includes("addProjectV2ItemById")) {
      return HttpResponse.json(mockAddProject);
    }
    if (body.query.includes("updateProjectV2ItemFieldValue")) {
      return HttpResponse.json({
        data: {
          updateProjectV2ItemFieldValue: { projectV2Item: { id: "PVTI_new" } },
        },
      });
    }
    if (body.query.includes("issueTemplates")) {
      return HttpResponse.json({
        data: { repository: { issueTemplates: [] } },
      });
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
  ...restHandlers,
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
    if (body.query.includes("addProjectV2ItemById")) {
      return HttpResponse.json(mockAddProject);
    }
    if (body.query.includes("issueTemplates")) {
      return HttpResponse.json({
        data: { repository: { issueTemplates: [] } },
      });
    }
    return HttpResponse.json({ data: {} });
  }),
];

const errorHandlers = [
  ...restHandlers,
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
    if (body.query.includes("addProjectV2ItemById")) {
      return HttpResponse.json(mockAddProject);
    }
    if (body.query.includes("issueTemplates")) {
      return HttpResponse.json({
        data: { repository: { issueTemplates: [] } },
      });
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
      canvas.getByText("オーナーを入力し Project を選択して Issue を表示"),
    ).toBeDefined();
  },
};

/** Issue がグラフ表示される */
export const WithIssues: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText("オーナー"), "octocat");

    // Wait for projects to load (Project select becomes enabled)
    await waitFor(
      () => {
        const trigger = canvas.getByLabelText("Project");
        expect(trigger.getAttribute("aria-disabled")).not.toBe("true");
      },
      { timeout: 3000 },
    );

    // MUI Select: click to open, then select from dropdown
    await userEvent.click(canvas.getByLabelText("Project"));
    const listbox = within(
      canvasElement.ownerDocument.body.querySelector(
        '[role="listbox"]',
      ) as HTMLElement,
    );
    await userEvent.click(listbox.getByText("#1 Sprint Board"));

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

    await userEvent.type(canvas.getByLabelText("オーナー"), "octocat");

    await waitFor(
      () => {
        const trigger = canvas.getByLabelText("Project");
        expect(trigger.getAttribute("aria-disabled")).not.toBe("true");
      },
      { timeout: 3000 },
    );

    await userEvent.click(canvas.getByLabelText("Project"));
    const listbox = within(
      canvasElement.ownerDocument.body.querySelector(
        '[role="listbox"]',
      ) as HTMLElement,
    );
    await userEvent.click(listbox.getByText("#1 Sprint Board"));

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

    await userEvent.type(canvas.getByLabelText("オーナー"), "octocat");

    await waitFor(
      () => {
        const trigger = canvas.getByLabelText("Project");
        expect(trigger.getAttribute("aria-disabled")).not.toBe("true");
      },
      { timeout: 3000 },
    );

    await userEvent.click(canvas.getByLabelText("Project"));
    const listbox = within(
      canvasElement.ownerDocument.body.querySelector(
        '[role="listbox"]',
      ) as HTMLElement,
    );
    await userEvent.click(listbox.getByText("#1 Sprint Board"));

    await expect(
      await canvas.findByText(/エラー:/, undefined, { timeout: 3000 }),
    ).toBeDefined();
  },
};
