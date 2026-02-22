import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { PaneContextMenu } from "./pane-context-menu";

const meta = {
  title: "Components/PaneContextMenu",
  component: PaneContextMenu,
  args: {
    onClose: fn(),
    onCreateIssue: fn(),
    onAddIssue: fn(),
    onAddPR: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "400px", height: "300px", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PaneContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** メニューが閉じている状態 */
export const Closed: Story = {
  args: {
    open: false,
    anchorPosition: null,
  },
};

/** メニューが開いている状態 */
export const Open: Story = {
  args: {
    open: true,
    anchorPosition: { x: 100, y: 100 },
  },
};
