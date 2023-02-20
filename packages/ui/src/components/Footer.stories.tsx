import type { Meta, StoryFn } from "@storybook/react";

import { Footer } from "./Footer";
export default {
  component: Footer,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof Footer> = () => <Footer />;

//👇 Each story then reuses that template

export const Primary = Template.bind({});
