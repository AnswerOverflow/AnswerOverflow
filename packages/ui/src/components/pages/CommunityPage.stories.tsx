import type { Story } from '@ladle/react';
import { loremIpsum } from 'lorem-ipsum';
import {
	mockChannelWithSettings,
	mockMessageFull,
	mockServer,
} from '~ui/test/props';
import { ChannelType } from '~ui/utils/discord';
import { CommunityPage } from './CommunityPage';
type CommunityPageProps = React.ComponentPropsWithoutRef<typeof CommunityPage>;

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

export const CommunityPageStory: Story<CommunityPageProps> = (props) => (
	<CommunityPage {...props} />
);
export const WithLongQuestion = CommunityPageStory.bind({});

CommunityPageStory.args = {
	channels: makeMockedChannels(100),
	server: mockServer(),
};

WithLongQuestion.args = {
	channels: [
		{
			channel: mockChannelWithSettings(),
			questions: [
				{
					message: mockMessageFull({
						content: loremIpsum({
							count: 250,
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
};
