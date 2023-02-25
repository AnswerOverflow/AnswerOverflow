import type { Meta, StoryObj } from "@storybook/react";

import { ServerInvite, ServerInviteProps } from "./ServerInvite";
const meta = {
  component: ServerInvite,
} as Meta<typeof ServerInvite>;

export default meta;

type Story = StoryObj<typeof meta>;

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

export const Primary: Story = {
  args: defaultMessage,
};
