import type { Meta, StoryObj } from '@storybook/react';
import {
	mockChannelWithSettings,
	mockMessageWithDiscordAccount,
	mockServer,
} from '~ui/test/props';

import { CommunityPage } from './CommunityPage';
const meta = {
	title: 'pages/CommunityPage',
	component: CommunityPage,
	render: (props) => <CommunityPage {...props} />,
	parameters: {
		layout: 'fullscreen',
	},
} as Meta<typeof CommunityPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CommunityPageStory: Story = {
	args: {
		results: [
			{
				message: {
					...mockMessageWithDiscordAccount(),
					solutionMessages: [],
					referencedMessage: mockMessageWithDiscordAccount(),
				},
				thread: mockChannelWithSettings(),
				score: 0.5,
				channel: mockChannelWithSettings({
					// AO's Discord server
					inviteCode: 'sxDN2rEdwD',
				}),
				server: mockServer(),
			},
		],
		server: mockServer(),
		isLoading: false,
	},
};
