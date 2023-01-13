import type { ComponentStory, Meta } from "@storybook/react";
import { within } from "@storybook/testing-library";
import { expect } from "@storybook/jest";
import { Navbar } from "./Navbar";
export default {
  component: Navbar,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: ComponentStory<typeof Navbar> = () => <Navbar />;

//👇 Each story then reuses that template

export const Primary = Template.bind({});

Primary.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const icon = await canvas.findByText("John Doe");
  expect(icon.innerText).toBe("John Doe");
};
