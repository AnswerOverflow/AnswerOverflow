import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox, CheckboxProps } from "./Checkbox";

const meta = {
  component: Checkbox,
  argTypes: {
    disabled: {
      control: { type: "boolean" },
      defaultValue: false,
    },
    checked: {
      control: { type: "boolean" },
      defaultValue: false,
    },
  },
} as Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CheckboxStory: Story = {
  render: (props: CheckboxProps) => <Checkbox {...props} />,
};
