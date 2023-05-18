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

function makeMockedChannelQuestions(
	amount: number,
	someLongMessages?: boolean,
) {
	if (amount > 20) {
		amount = 20;
	}
	return Array.from({ length: amount }).map(() => {
		const randomBoolean = Math.random() >= 0.5;

		if (!randomBoolean || !someLongMessages) {
			return {
				message: mockMessageFull(),
				thread: mockChannelWithSettings({
					type: ChannelType.PublicThread,
				}),
			};
		}

		return {
			message: mockMessageFull({
				content: loremIpsum({
					count: 3500,
				}),
			}),
			thread: mockChannelWithSettings({
				type: ChannelType.PublicThread,
			}),
		};
	});
}

function makeMockedChannels(amount: number, someLongMessages?: boolean) {
	return Array.from({ length: amount }).map(() => ({
		channel: mockChannelWithSettings(),
		questions: makeMockedChannelQuestions(100, someLongMessages),
	}));
}

export const CommunityPageStory: Story = {
	args: {
		channels: makeMockedChannels(100),
		server: mockServer(),
	},
};

export const CommunityPageStoryWithSomeSuperLongQuestions: Story = {
	args: {
		channels: makeMockedChannels(100, true),
		server: mockServer(),
	},
};
