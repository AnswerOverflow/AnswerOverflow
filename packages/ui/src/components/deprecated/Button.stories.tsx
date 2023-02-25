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

export const PrimaryDep = {
  args: {
    intent: "primary",
    children: "Primary",
  },
};

export const SecondaryDep = {
  args: {
    intent: "secondary",
    children: "Secondary",
  },
};

export const DangerDep = {
  args: {
    intent: "danger",
    children: "Danger",
  },
};
