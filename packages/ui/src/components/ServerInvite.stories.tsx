import type { Meta, StoryFn } from "@storybook/react";

import { ServerInvite, ServerInviteProps } from "./ServerInvite";
export default {
  component: ServerInvite,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof ServerInvite> = (args: ServerInviteProps) => (
  <ServerInvite {...args} />
);

//👇 Each story then reuses that template
const defaultMessage: ServerInviteProps = {
  server: {
    icon: null,
    id: "0",
    name: "Test Server",
  },
  channel: {
    id: "0",
    name: "general",
    serverId: "0",
    parentId: null,
    type: 0,
    inviteCode: "123456",
  },
  isUserInServer: false,
};

export const Primary = Template.bind({});
Primary.args = defaultMessage;
