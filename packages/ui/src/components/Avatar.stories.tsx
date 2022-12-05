import type { ComponentStory, Meta } from "@storybook/react";
import Avatar, { AvatarProps } from "./Avatar";
import { within } from "@storybook/testing-library";
import { expect } from "@storybook/jest";
export default {
  title: "Avatar",
  component: Avatar,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: ComponentStory<typeof Avatar> = (args: AvatarProps) => <Avatar {...args} />;

//👇 Each story then reuses that template
export const Primary = Template.bind({});
Primary.args = { user: { name: "John Doe" } };

Primary.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const icon = await canvas.findByText("John Doe");
  expect(icon.innerText).toBe("John Doe");
};

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
