import type { Meta, StoryObj } from "@storybook/react";
import { mockServer } from "~ui/test/props";

import { ServerInvite, ServerInviteProps } from "./ServerInvite";
const meta = {
  component: ServerInvite,
} as Meta<typeof ServerInvite>;

export default meta;

type Story = StoryObj<typeof meta>;

//👇 Each story then reuses that template
const server = mockServer();
const defaultMessage: ServerInviteProps = {
  server: server,
  channel: {
    id: "0",
    name: "general",
    serverId: server.id,
    parentId: null,
    type: 0,
    inviteCode: "123456",
  },
  isUserInServer: false,
};

export const Primary: Story = {
  args: defaultMessage,
};
