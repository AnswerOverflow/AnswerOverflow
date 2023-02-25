import type { Meta, StoryFn, StoryObj } from "@storybook/react";
import { mockDiscordAccount } from "~ui/test/props";
import { DiscordAvatar, DiscordAvatarProps } from "./DiscordAvatar";
const meta = {
  component: DiscordAvatar,
} satisfies Meta<typeof DiscordAvatar>;

export default meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof DiscordAvatar> = (args: DiscordAvatarProps) => (
  <DiscordAvatar {...args} />
);

type Story = StoryObj<typeof meta>;

//👇 Each story then reuses that template
export const Primary: Story = {
  args: {
    size: "md",
    user: mockDiscordAccount(),
  },
};

export const WithImage = Template.bind({});
WithImage.args = {
  size: "md",
  user: mockDiscordAccount({
    avatar: "7716e305f7de26045526d9da6eef2dab",
    id: "523949187663134754",
  }),
};
