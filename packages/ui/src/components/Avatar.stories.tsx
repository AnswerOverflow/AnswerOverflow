import type { ComponentStory, Meta } from "@storybook/react";
import Avatar, { AvatarProps } from "./Avatar";

export default {
  title: "Avatar",
  component: Avatar,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: ComponentStory<typeof Avatar> = (args: AvatarProps) => <Avatar {...args} />;

//👇 Each story then reuses that template
export const Primary = Template.bind({});
Primary.args = { user: { name: "John Doe" } };

export const Secondary = Template.bind({});
Secondary.args = {
  ...Primary.args,
  user: {
    name: "El Doe",
  },
};

export const Tertiary = Template.bind({});
Tertiary.args = {
  ...Primary.args,
  user: {
    name: "Can Name",
  },
};
