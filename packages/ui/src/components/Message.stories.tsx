import type { ComponentStory, Meta } from "@storybook/react";
import { MessageProps, Message } from "./Message";
import { mockDiscordAccount } from "~ui/test/props";
export default {
  component: Message,
  parameters: {
    a11y: {
      disable: true,
    },
  },
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: ComponentStory<typeof Message> = (args: MessageProps) => <Message {...args} />;

const lorem_ipsum =
  "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem fugit iure delectus tempore! Nam nihil animi nemo nisi eligendi veniam obcaecati accusantium, sunt maiores tenetur illum saepe incidunt beatae hic.";

//👇 Each story then reuses that template
const default_message: MessageProps = {
  message: {
    content: lorem_ipsum,
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

export const Primary = Template.bind({});
Primary.args = default_message;

export const OverflowLetters = Template.bind({});
OverflowLetters.args = {
  ...Primary.args,
  message: {
    ...default_message.message,
    content:
      "Helloooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo",
    author: mockDiscordAccount(),
  },
};

export const WithImages = Template.bind({});
WithImages.args = {
  ...Primary.args,
  message: {
    ...default_message.message,
    channel_id: "1031266112802914305",
    server_id: "701008832645824553",
    images: [
      {
        url: "https://cdn.discordapp.com/attachments/1037547270733832242/1063119696334966794/image.png",
        width: 897,
        height: 672,
        description: null,
      },
      {
        url: "https://cdn.discordapp.com/attachments/1037547270733832242/1063121784578261033/image.png",
        width: 1440,
        height: 2560,
        description: null,
      },
      {
        url: "https://cdn.discordapp.com/attachments/1037547270733832242/1063121784578261033/image.png",
        width: null,
        height: null,
        description: null,
      },
    ],
  },
};

export const WithCode = Template.bind({});
WithCode.args = {
  ...Primary.args,
  message: {
    ...default_message.message,
    content: `
    \`\`\`typescript
  const variable = 'hello';

  function getProfile(id: string): {
    name: string; address: string, photo: string
  } {
    return {
      name: 'ben', address: "ben's house", photo: "/ben.png"
    };
  }
    \`\`\`
  `,
  },
};

export const WithXSS = Template.bind({});
WithXSS.args = {
  ...Primary.args,
  message: {
    ...default_message.message,
    content: "<script> alert('XSS')</script>",
  },
};

export const WithXSSInCodeBlock = Template.bind({});
WithXSSInCodeBlock.args = {
  ...Primary.args,
  message: {
    ...default_message.message,
    content: "```<script> alert('XSS')</script>```",
  },
};
