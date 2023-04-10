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
		channel: mockChannelWithSettings({
			// AO's Discord server
			inviteCode: 'sxDN2rEdwD',
		}),
		location: 'Search Results',
		isUserInServer: 'in_server',
	},
};

export const NotInServer: Story = {
	args: {
		server: mockServer(),
		channel: mockChannelWithSettings({
			// AO's Discord server
			inviteCode: 'sxDN2rEdwD',
		}),
		isUserInServer: 'not_in_server',
	},
};
