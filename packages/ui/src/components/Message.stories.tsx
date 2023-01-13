import type { ComponentStory, Meta } from "@storybook/react";
import { within } from "@storybook/testing-library";
import { expect } from "@storybook/jest";
import { MessageProps, Message } from "./Message";
import { with_image } from "~ui/test/props";
export default {
  component: Message,
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
    },
    images: [],
    channel_id: "0",
    server_id: "0",
    solutions: [],
  },
};

export const Primary = Template.bind({});
Primary.args = default_message;

Primary.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const icon = await canvas.findByText("John Doe");
  expect(icon.innerText).toBe("John Doe");
};

export const OverflowLetters = Template.bind({});
OverflowLetters.args = {
  ...Primary.args,
  message: {
    ...default_message.message,
    content:
      "Helloooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo",
    author: with_image.user,
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
      },
      {
        url: "https://cdn.discordapp.com/attachments/1037547270733832242/1063121784578261033/image.png",
        width: 1440,
        height: 2560,
      },
    ],
  },
};

export const WithCode = Template.bind({});
WithCode.args = {
  ...Primary.args,
  message: {
    ...default_message.message,
  },
};
