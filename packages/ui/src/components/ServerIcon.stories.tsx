import type { Meta, StoryFn } from "@storybook/react";
import { ServerIcon, ServerIconProps } from "./ServerIcon";
import { mockServer } from "~ui/test/props";
export default {
  component: ServerIcon,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof ServerIcon> = (args: ServerIconProps) => <ServerIcon {...args} />;

//👇 Each story then reuses that template
export const Primary = Template.bind({});
Primary.args = {
  server: mockServer(),
};

export const WithImage = Template.bind({});
WithImage.args = {
  server: mockServer({
    name: "AnswerOverflow",
    id: "952724385238761475",
    icon: "4e610bdea5aacf259013ed8cada0bc1d",
  }),
};

export const Tertiary = Template.bind({});
Tertiary.args = {
  ...Primary.args,
};
