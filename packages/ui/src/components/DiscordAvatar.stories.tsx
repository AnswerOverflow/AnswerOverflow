import type { Meta, StoryFn } from "@storybook/react";
import { mockDiscordAccount } from "~ui/test/props";
import { DiscordAvatar, DiscordAvatarProps } from "./DiscordAvatar";
export default {
  component: DiscordAvatar,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof DiscordAvatar> = (args: DiscordAvatarProps) => (
  <DiscordAvatar {...args} />
);

//👇 Each story then reuses that template
export const Primary = Template.bind({});
Primary.args = {
  size: "md",
  user: mockDiscordAccount(),
};

export const WithImage = Template.bind({});
WithImage.args = {
  size: "md",
  user: mockDiscordAccount({
    avatar: "7716e305f7de26045526d9da6eef2dab",
    id: "523949187663134754",
  }),
};
