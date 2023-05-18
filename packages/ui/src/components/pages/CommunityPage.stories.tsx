import type { Meta, StoryObj } from '@storybook/react';
import { loremIpsum } from 'lorem-ipsum';
import {
	mockChannelWithSettings,
	mockMessageFull,
	mockServer,
} from '~ui/test/props';
import { ChannelType } from '~ui/utils/discord';

import { CommunityPage } from './CommunityPage';
const meta = {
	component: CommunityPage,
	render: (props) => <CommunityPage {...props} />,
	parameters: {
		layout: 'fullscreen',
	},
} as Meta<typeof CommunityPage>;

export default meta;

type Story = StoryObj<typeof meta>;

function makeMockedChannelQuestions(amount: number) {
	if (amount > 20) {
		amount = 20;
	}
	return Array.from({ length: amount }).map(() => ({
		message: mockMessageFull(),
		thread: mockChannelWithSettings({
			type: ChannelType.PublicThread,
		}),
	}));
}

function makeMockedChannels(amount: number) {
	return Array.from({ length: amount }).map(() => ({
		channel: mockChannelWithSettings(),
		questions: makeMockedChannelQuestions(100),
	}));
}

export const CommunityPageStory: Story = {
	args: {
		channels: makeMockedChannels(100),
		server: mockServer(),
	},
};

export const WithLongQuestion: Story = {
	args: {
		channels: [
			{
				channel: mockChannelWithSettings(),
				questions: [
					{
						message: mockMessageFull({
							content: loremIpsum({
								count: 3500,
							}),
						}),
						thread: mockChannelWithSettings({
							type: ChannelType.PublicThread,
						}),
					},
				],
			},
		],
		server: mockServer(),
	},
};
