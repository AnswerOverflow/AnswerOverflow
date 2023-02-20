import type { Meta, StoryFn } from "@storybook/react";
import { Button, ButtonProps } from "./Button";

export default {
  title: "Deprecated/Button",
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
export const PrimaryDep = Template.bind({});
PrimaryDep.args = {
  intent: "primary",
  children: "Primary",
};

export const SecondaryDep = Template.bind({});
SecondaryDep.args = {
  intent: "secondary",
  children: "Secondary",
};

export const DangerDep = Template.bind({});
DangerDep.args = {
  intent: "danger",
  children: "Danger",
};
