import type { Preview } from "@storybook/react-vite";
import { initialize, mswLoader } from "msw-storybook-addon";

// Initialize MSW
initialize();

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
  loaders: [mswLoader],
};

export default preview;
