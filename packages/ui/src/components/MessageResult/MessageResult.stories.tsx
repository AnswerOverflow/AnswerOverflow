import type { Meta, StoryObj } from "@storybook/react";
import { MessageResult, MessageResultProps } from "./MessageResult";

const meta = {
  component: MessageResult,
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
} as Meta<typeof MessageResult>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  render: (props: MessageResultProps) => <MessageResult {...props} />,

  args: {
    authorAvatar: undefined,
    authorName: "user#1234",
    questionPostedTimestamp: "1 hour ago",
    title: "How do I write a print statement in python?",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
};
