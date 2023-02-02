import type { Meta, StoryFn } from "@storybook/react";
import { Home } from "./Home";

export default {
  component: Home,
  parameters: {
    layout: "fullscreen",
  },
} as Meta<typeof Home>;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof Home> = () => <Home />;

export const Homepage = Template.bind({});
