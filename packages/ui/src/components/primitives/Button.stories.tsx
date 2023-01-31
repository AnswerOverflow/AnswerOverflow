import type { Meta, StoryFn } from "@storybook/react";
import { Button, ButtonProps } from "./Button";

export default {
  component: Button,
  argTypes: {
    intent: {
      options: ["primary", "secondary", "danger", "success"],
      control: { type: "radio" },
    },
  },
} as Meta<typeof Button>;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof Button> = (args: ButtonProps) => <Button {...args} />;

//👇 Each story then reuses that template
export const Primary = Template.bind({});
Primary.args = {
  intent: "primary",
  children: "Primary",
};

export const Secondary = Template.bind({});
Secondary.args = {
  intent: "secondary",
  children: "Secondary",
};

export const Danger = Template.bind({});
Danger.args = {
  intent: "danger",
  children: "Danger",
};
