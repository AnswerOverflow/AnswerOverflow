import type { Meta, StoryFn } from "@storybook/react";
import { LandingAnimation, LandingAnimationProps } from "./LandingAnimation";
import { mockDiscordAccount } from "~ui/test/props";
import type { MessageProps } from "~ui/components/Message";

export default {
  component: LandingAnimation,
} as Meta<typeof LandingAnimation>;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof LandingAnimation> = (args: LandingAnimationProps) => (
  <LandingAnimation {...args} />
);

const default_message: MessageProps = {
  message: {
    content: "Lorem",
    id: "1063028763656458270",
    author: {
      name: "John Doe",
      id: "0",
      avatar: null,
    },
    public: true,
    images: [],
    channel_id: "0",
    server_id: "0",
    solutions: [],
    child_thread: null,
    replies_to: null,
  },
};

//👇 Each story then reuses that template
export const Primary = Template.bind({});
Primary.args = {
  messageData: {
    message: {
      ...default_message.message,
      content: "Hello World",
      author: mockDiscordAccount({
        name: "Jolt",
      }),
    },
  },
};
