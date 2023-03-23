import type { Meta, StoryObj } from '@storybook/react';
import {
	mockChannelWithSettings,
	mockMessageFull,
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
		channels: [
			{
				channel: mockChannelWithSettings(),
				questions: [
					{
						message: mockMessageFull(),
						thread: mockChannelWithSettings(),
					},
				],
			},
		],
		server: mockServer(),
	},
};
