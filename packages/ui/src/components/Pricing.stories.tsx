import type { StoryFn, Meta } from "@storybook/react";

import { Pricing } from "./Pricing";
export default {
  component: Pricing,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof Pricing> = () => <Pricing />;

//👇 Each story then reuses that template

export const Primary = Template.bind({});
