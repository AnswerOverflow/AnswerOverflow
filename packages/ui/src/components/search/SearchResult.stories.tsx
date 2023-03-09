import type { Meta, StoryObj } from "@storybook/react";
import { mockChannelWithSettings, mockMessageWithDiscordAccount, mockServer } from "~ui/test/props";
import { MessageResultProps, SearchResult } from "./SearchResult";

const meta = {
  component: SearchResult,
  argTypes: {},
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
  render: (props: MessageResultProps) => (
    <div className="xl:w-2/3">
      <SearchResult {...props} />
    </div>
  ),
};
