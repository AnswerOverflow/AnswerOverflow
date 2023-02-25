import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "Deprecated/Button",
  component: Button,
  argTypes: {
    intent: {
      options: ["primary", "secondary", "danger", "success"],
      control: { type: "radio" },
    },
  },
} as Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;
export const PrimaryDep: Story = {
  args: {
    intent: "primary",
    children: "Primary",
  },
};

export const SecondaryDep: Story = {
  args: {
    intent: "secondary",
    children: "Secondary",
  },
};

export const DangerDep: Story = {
  args: {
    intent: "danger",
    children: "Danger",
  },
};
