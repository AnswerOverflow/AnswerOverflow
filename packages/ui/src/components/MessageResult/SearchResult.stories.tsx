import type { Meta, StoryObj } from "@storybook/react";
import { mockChannelWithSettings, mockMessageWithDiscordAccount, mockServer } from "~ui/test/props";
import { MessageResult, MessageResultProps } from "./SearchResult";

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
  render: (props: MessageResultProps) => (
    <div className="h-full w-2/3 px-2">
      <MessageResult {...props} />
    </div>
  ),

  args: {
    result: {
      message: {
        ...mockMessageWithDiscordAccount(),
        solutionMessages: [mockMessageWithDiscordAccount()],
        referencedMessage: mockMessageWithDiscordAccount(),
      },
      thread: mockChannelWithSettings(),
      score: 0.5,
      channel: mockChannelWithSettings(),
      server: mockServer(),
    },
  },
};
