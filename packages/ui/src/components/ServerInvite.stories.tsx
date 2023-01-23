import type { ComponentStory, Meta } from "@storybook/react";

import { ServerInvite, ServerInviteProps } from "./ServerInvite";
export default {
  component: ServerInvite,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: ComponentStory<typeof ServerInvite> = (args: ServerInviteProps) => (
  <ServerInvite {...args} />
);

//👇 Each story then reuses that template
const default_message: ServerInviteProps = {
  server: {
    icon: null,
    id: "0",
    name: "Test Server",
  },
  channel: {
    id: "0",
    name: "general",
    server_id: "0",
    parent_id: null,
    type: 0,
  },
  is_user_in_server: false,
};

export const Primary = Template.bind({});
Primary.args = default_message;
