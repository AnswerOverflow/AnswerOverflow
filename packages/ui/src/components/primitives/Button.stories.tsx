import type { Meta, StoryFn } from "@storybook/react";
import { Button, ButtonProps } from "./Button";

export default {
  component: Button,
  argTypes: {
    color: {
      control: {
        type: "radio",
      },
      options: ["red", "blue", "green", "black", "white"],
    },
    type: {
      control: { type: "radio" },
      options: ["solid", "ghost"],
    },
    disabled: {
      control: { type: "boolean" },
      defaultValue: false,
    },
  },
} as Meta<typeof Button>;

export const ButtonPrimary = {
  render: (props: ButtonProps) => (
    <Button color={props.color} disabled={props.disabled} onClick={props.onClick} type={props.type}>
      Primary
    </Button>
  ),

  args: {
    type: "ghost",
    color: "white",
  },
};
