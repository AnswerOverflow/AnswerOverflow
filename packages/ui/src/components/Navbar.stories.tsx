import type { ComponentStory, Meta } from "@storybook/react";

import { Navbar } from "./Navbar";
export default {
  component: Navbar,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: ComponentStory<typeof Navbar> = () => <Navbar />;

//👇 Each story then reuses that template

export const Primary = Template.bind({});
