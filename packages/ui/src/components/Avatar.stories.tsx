import type { Meta, StoryFn } from "@storybook/react";
import { DiscordAvatar, AvatarProps } from "./DiscordAvatar";
import { default_avatar, with_image } from "~ui/test/props";
export default {
  component: DiscordAvatar,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof DiscordAvatar> = (args: AvatarProps) => <DiscordAvatar {...args} />;

//👇 Each story then reuses that template
export const Primary = Template.bind({});
Primary.args = default_avatar;

export const Secondary = Template.bind({});
Secondary.args = {
  ...Primary.args,
  ...with_image,
};

export const Tertiary = Template.bind({});
Tertiary.args = {
  ...Primary.args,
};
