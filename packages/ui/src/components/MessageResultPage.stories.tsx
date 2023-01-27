import type { StoryFn, Meta } from "@storybook/react";
import { mockChannel, mockMessageWithDiscordAccount, mockServer } from "~ui/test/props";
import { MessageResultPage, MessageResultPageProps } from "./MessageResultPage";
export default {
  component: MessageResultPage,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof MessageResultPage> = (args: MessageResultPageProps) => {
  return <MessageResultPage {...args} />;
};

//👇 Each story then reuses that template

const default_message: MessageResultPageProps = {
  messages: [
    mockMessageWithDiscordAccount({
      id: "1",
      solutions: ["4"],
      public: false,
    }),
    mockMessageWithDiscordAccount({
      id: "2",
    }),
    mockMessageWithDiscordAccount({
      id: "3",
      public: false,
    }),
    mockMessageWithDiscordAccount({
      id: "4",
      public: false,
    }),
    mockMessageWithDiscordAccount({
      id: "5",
    }),
  ],
  channel: mockChannel(),
  query: "",
  server: { ...mockServer(), id: "83730679338106880" },
};

export const Primary = Template.bind({});
Primary.args = default_message;
