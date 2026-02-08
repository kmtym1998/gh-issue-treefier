import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import { expect, fn, userEvent, within } from "storybook/test";
import { FilterPanel } from "./filter-panel";

const mockProjects = {
  data: {
    user: {
      projectsV2: {
        nodes: [
          { id: "PVT_1", title: "Sprint Board", number: 1 },
          { id: "PVT_2", title: "Roadmap", number: 2 },
        ],
      },
    },
  },
};

const mockFields = {
  data: {
    node: {
      fields: {
        nodes: [
          {
            id: "F1",
            name: "Status",
            dataType: "SINGLE_SELECT",
            options: [
              { id: "O1", name: "Todo" },
              { id: "O2", name: "In Progress" },
              { id: "O3", name: "Done" },
            ],
          },
          {
            id: "F2",
            name: "Priority",
            dataType: "SINGLE_SELECT",
            options: [
              { id: "O4", name: "High" },
              { id: "O5", name: "Medium" },
              { id: "O6", name: "Low" },
            ],
          },
          {
            id: "F3",
            name: "Iteration",
            dataType: "ITERATION",
            configuration: {
              iterations: [
                { id: "I1", title: "Sprint 1" },
                { id: "I2", title: "Sprint 2" },
              ],
            },
          },
          { id: "F4", name: "Title", dataType: "TEXT" },
        ],
      },
    },
  },
};

const graphqlHandlers = [
  http.post("/api/github/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string };
    if (body.query.includes("projectsV2")) {
      return HttpResponse.json(mockProjects);
    }
    if (body.query.includes("fields")) {
      return HttpResponse.json(mockFields);
    }
    return HttpResponse.json({ data: {} });
  }),
];

const meta = {
  title: "Components/FilterPanel",
  component: FilterPanel,
  args: {
    onChange: fn(),
  },
  parameters: {
    msw: {
      handlers: graphqlHandlers,
    },
  },
} satisfies Meta<typeof FilterPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TypeOwner: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const ownerInput = canvas.getByLabelText("Owner");
    await userEvent.type(ownerInput, "octocat");

    expect(args.onChange).toHaveBeenCalled();
    const lastCall =
      args.onChange.mock.calls[args.onChange.mock.calls.length - 1];
    expect(lastCall[0]).toMatchObject({
      owner: "octocat",
    });
  },
};

export const ChangeState: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const stateSelect = canvas.getByLabelText("State");
    await userEvent.selectOptions(stateSelect, "closed");

    expect(args.onChange).toHaveBeenCalled();
    const lastCall =
      args.onChange.mock.calls[args.onChange.mock.calls.length - 1];
    expect(lastCall[0]).toMatchObject({ state: "closed" });
  },
};
