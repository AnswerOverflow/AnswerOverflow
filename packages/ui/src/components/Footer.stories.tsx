import type { ComponentStory, Meta } from "@storybook/react";

import { Footer } from "./Footer";
export default {
  component: Footer,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: ComponentStory<typeof Footer> = () => <Footer />;

//👇 Each story then reuses that template

export const Primary = Template.bind({});
