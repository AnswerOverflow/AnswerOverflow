import type { Meta, StoryFn } from "@storybook/react";
import { Avatar, AvatarProps } from "./Avatar";
import { within } from "@storybook/testing-library";
import { expect } from "@storybook/jest";
import { default_avatar, with_image } from "~ui/test/props";
export default {
  component: Avatar,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof Avatar> = (args: AvatarProps) => <Avatar {...args} />;

//👇 Each story then reuses that template
export const Primary = Template.bind({});
Primary.args = default_avatar as AvatarProps;

Primary.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const icon = await canvas.findByText("John Doe");
  expect(icon.innerText).toBe("John Doe");
};

export const Secondary = Template.bind({});
Secondary.args = {
  ...Primary.args,
  ...(with_image as AvatarProps),
};

export const Tertiary = Template.bind({});
Tertiary.args = {
  ...Primary.args,
};
