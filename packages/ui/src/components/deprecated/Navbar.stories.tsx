import type { StoryFn, Meta } from "@storybook/react";

import { Navbar } from "./Navbar";
export default {
  title: "Deprecated/Navbar",
  component: Navbar,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof Navbar> = () => <Navbar />;

//👇 Each story then reuses that template

export const Primary = Template.bind({});
