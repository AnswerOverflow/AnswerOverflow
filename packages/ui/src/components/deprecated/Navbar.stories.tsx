import type { StoryFn, Meta } from "@storybook/react";

import { Navbar } from "./Navbar";
export default {
  title: "Deprecated/Navbar",
  component: Navbar,
} as Meta;

export const Primary = {
  render: () => <Navbar />,
};
