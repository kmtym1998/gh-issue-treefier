import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import { fn } from "storybook/test";
import type { ProjectField } from "../types/project";
import { IssueCreateForm } from "./issue-create-form";

const repos = ["octocat/hello-world", "octocat/linguist"];

const projectFields: ProjectField[] = [
  {
    id: "field-status",
    name: "Status",
    dataType: "SINGLE_SELECT",
    options: [
      { id: "opt-todo", name: "Todo" },
      { id: "opt-in-progress", name: "In Progress" },
      { id: "opt-done", name: "Done" },
    ],
  },
  {
    id: "field-iteration",
    name: "Sprint",
    dataType: "ITERATION",
    options: [
      { id: "iter-1", name: "Sprint 1" },
      { id: "iter-2", name: "Sprint 2" },
    ],
  },
];

const mockCollaborators = [
  { login: "alice", avatar_url: "https://github.com/alice.png" },
  { login: "bob", avatar_url: "https://github.com/bob.png" },
  { login: "carol", avatar_url: "https://github.com/carol.png" },
];

const mockTemplates = {
  data: {
    repository: {
      issueTemplates: [
        {
          name: "Bug report",
          title: "Bug: ",
          body: "## Description\n\n## Steps to reproduce\n\n## Expected behavior",
          about: "Report a bug",
        },
        {
          name: "Feature request",
          title: "Feature: ",
          body: "## What would you like?\n\n## Why do you need this?",
          about: "Request a new feature",
        },
      ],
    },
  },
};

const mockCreatedIssue = {
  id: 1,
  node_id: "I_kwDO123",
  number: 42,
  title: "New Issue",
  html_url: "https://github.com/octocat/hello-world/issues/42",
};

const mockAddProject = {
  data: {
    addProjectV2ItemById: {
      item: { id: "PVTI_new" },
    },
  },
};

const handlersWithTemplates = [
  http.get("/api/github/rest/repos/:owner/:repo/collaborators", () =>
    HttpResponse.json(mockCollaborators),
  ),
  http.get("/api/github/rest/repos/:owner/:repo/issues", () =>
    HttpResponse.json([]),
  ),
  http.post("/api/github/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string };
    if (body.query.includes("issueTemplates")) {
      return HttpResponse.json(mockTemplates);
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
    return HttpResponse.json({ data: {} });
  }),
  http.post("/api/github/rest/repos/:owner/:repo/issues", () =>
    HttpResponse.json(mockCreatedIssue, { status: 201 }),
  ),
];

const handlersNoTemplates = [
  http.get("/api/github/rest/repos/:owner/:repo/collaborators", () =>
    HttpResponse.json(mockCollaborators),
  ),
  http.post("/api/github/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string };
    if (body.query.includes("issueTemplates")) {
      return HttpResponse.json({
        data: { repository: { issueTemplates: [] } },
      });
    }
    if (body.query.includes("addProjectV2ItemById")) {
      return HttpResponse.json(mockAddProject);
    }
    return HttpResponse.json({ data: {} });
  }),
  http.post("/api/github/rest/repos/:owner/:repo/issues", () =>
    HttpResponse.json(mockCreatedIssue, { status: 201 }),
  ),
];

const handlersError = [
  http.get("/api/github/rest/repos/:owner/:repo/collaborators", () =>
    HttpResponse.json(mockCollaborators),
  ),
  http.post("/api/github/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string };
    if (body.query.includes("issueTemplates")) {
      return HttpResponse.json(mockTemplates);
    }
    return HttpResponse.json({ data: {} });
  }),
  http.post("/api/github/rest/repos/:owner/:repo/issues", () =>
    HttpResponse.json(
      { message: "Validation Failed" },
      { status: 422, statusText: "Unprocessable Entity" },
    ),
  ),
];

const meta = {
  title: "Components/IssueCreateForm",
  component: IssueCreateForm,
  args: {
    repos,
    projectId: "PVT_1",
    projectFields,
    onSuccess: fn(),
    onClose: fn(),
  },
  parameters: {
    msw: { handlers: handlersWithTemplates },
  },
  decorators: [
    (Story) => (
      <div
        style={{ height: "600px", display: "flex", justifyContent: "flex-end" }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IssueCreateForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 空フォーム（テンプレート・コラボレーターなし） */
export const Empty: Story = {
  parameters: {
    msw: { handlers: handlersNoTemplates },
  },
};

/** テンプレートとコラボレーターあり（リポジトリ選択後） */
export const WithTemplatesAndCollaborators: Story = {
  parameters: {
    msw: { handlers: handlersWithTemplates },
  },
};

/** プロジェクトフィールドなし */
export const NoProjectFields: Story = {
  args: {
    projectFields: [],
  },
  parameters: {
    msw: { handlers: handlersNoTemplates },
  },
};

/** 送信時に API エラーが発生 */
export const SubmitError: Story = {
  parameters: {
    msw: { handlers: handlersError },
  },
};
