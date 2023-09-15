import type { Story } from '@ladle/react';
import { loremIpsum } from 'lorem-ipsum';
import {
	mockChannelWithSettings,
	mockMessageFull,
	mockPublicServer,
} from '~ui/test/props';
import { ChannelType } from '~ui/utils/discord';
import { CommunityPage } from './CommunityPage';
import { StoryDefault } from '@ladle/react';

export default {
	title: '!Pages / Community Page',
} satisfies StoryDefault;

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
	server: mockPublicServer(),
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
	server: mockPublicServer(),
};

export const WithSolvedQuestion = CommunityPageStory.bind({});
WithSolvedQuestion.args = {
	channels: [
		{
			channel: mockChannelWithSettings(),
			questions: [
				{
					message: mockMessageFull({
						content: loremIpsum({
							count: 250,
						}),
						solutions: [mockMessageFull()],
					}),
					thread: mockChannelWithSettings({
						type: ChannelType.PublicThread,
					}),
				},
			],
		},
	],
	server: mockPublicServer(),
};

export const WithLongNameAndDescription = CommunityPageStory.bind({});
WithLongNameAndDescription.args = {
	channels: [
		{
			channel: mockChannelWithSettings({
				name: 'This is a very long channel name that will be truncated',
			}),
			questions: [
				{
					message: mockMessageFull({
						content: loremIpsum({
							count: 250,
						}),
						solutions: [mockMessageFull()],
					}),
					thread: mockChannelWithSettings({
						type: ChannelType.PublicThread,
					}),
				},
			],
		},
	],
	server: mockPublicServer({
		name: 'This is a very long server name that will be truncated',
		description:
			"This is a very long server description that will be truncated and won't be visible on mobile devices asd asd asdasd asd asdasd asd asd asdas dasd asd asd adas",
	}),
};
