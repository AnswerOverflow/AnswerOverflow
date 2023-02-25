import type { Meta, StoryFn } from "@storybook/react";

import { ServerInvite, ServerInviteProps } from "./ServerInvite";
export default {
  component: ServerInvite,
} as Meta;

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

export const Primary = {
  args: defaultMessage,
};
