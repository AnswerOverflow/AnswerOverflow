import type { Meta, StoryObj } from '@storybook/react';
import { mockChannelWithSettings, mockServer } from '~ui/test/props';

import { ServerInviteRenderer } from './ServerInvite';
const meta = {
	component: ServerInviteRenderer,
} as Meta<typeof ServerInviteRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InServer: Story = {
	args: {
		server: mockServer(),
		channel: mockChannelWithSettings(),
		isUserInServer: true,
	},
};

export const NotInServer: Story = {
	args: {
		server: mockServer(),
		channel: mockChannelWithSettings(),
		isUserInServer: false,
	},
};
