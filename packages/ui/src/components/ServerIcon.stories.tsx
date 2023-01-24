import type { Meta, StoryFn } from "@storybook/react";
import { ServerIcon, ServerIconProps } from "./ServerIcon";
import { within } from "@storybook/testing-library";
import { expect } from "@storybook/jest";
import { mockServer, with_image } from "~ui/test/props";
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

Primary.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const icon = await canvas.findByAltText("John Doe");
  expect(icon).toBeDefined();
};

export const Secondary = Template.bind({});
Secondary.args = {
  ...Primary.args,
  ...with_image,
};

export const Tertiary = Template.bind({});
Tertiary.args = {
  ...Primary.args,
};
