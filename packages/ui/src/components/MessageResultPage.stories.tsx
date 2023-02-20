import type { StoryFn, Meta } from "@storybook/react";
import { mockChannelWithSettings, mockMessageWithDiscordAccount, mockServer } from "~ui/test/props";
import { MessageResultPage, MessageResultPageProps } from "./MessageResultPage";
export default {
  component: MessageResultPage,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof MessageResultPage> = (args: MessageResultPageProps) => {
  return <MessageResultPage {...args} />;
};

//👇 Each story then reuses that template

const defaultMessage: MessageResultPageProps = {
  messages: [
    mockMessageWithDiscordAccount({
      id: "1",
      solutionIds: ["4"],
      public: false,
      content: " THis is the first private message",
    }),
    mockMessageWithDiscordAccount({
      id: "2",
      content: "This is the first public message",
    }),
    mockMessageWithDiscordAccount({
      id: "3",
      public: false,
      content: "This is the second private message",
    }),
    mockMessageWithDiscordAccount({
      id: "4",
      public: false,
      content: "This is the third private message",
    }),
    mockMessageWithDiscordAccount({
      id: "5",
      content: "This is the second public message",
    }),
  ],
  channel: mockChannelWithSettings(),
  query: "",
  server: { ...mockServer(), id: "83730679338106880" },
};

export const Primary = Template.bind({});
Primary.args = defaultMessage;
