import type { Meta, StoryObj } from "@storybook/react";
import { mockChannelWithSettings, mockMessageWithDiscordAccount, mockServer } from "~ui/test/props";
import { SearchResult } from "./SearchResult";

const meta = {
  component: SearchResult,
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
} as Meta<typeof SearchResult>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
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
