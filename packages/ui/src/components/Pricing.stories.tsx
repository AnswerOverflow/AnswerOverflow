import type { StoryFn, Meta } from "@storybook/react";

import { Pricing } from "./Pricing";
export default {
  component: Pricing,
} as Meta;

export const Primary = {
  render: () => <Pricing />,
};
