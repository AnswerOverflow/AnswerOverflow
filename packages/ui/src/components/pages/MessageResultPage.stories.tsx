import type { Story } from '@ladle/react';
import {
	mockChannelWithSettings,
	mockMessageWithDiscordAccount,
	mockPublicServer,
} from '~ui/test/props';
import {
	MessageResultPage,
	type MessageResultPageProps,
} from './MessageResultPage';
import { PageWrapper } from './PageWrapper';
import { StoryDefault } from '@ladle/react/typings-for-build/app/exports';
export default {
	title: '!Pages / Message Result',
} satisfies StoryDefault;

export const Primary: Story<MessageResultPageProps> = (props) => (
	<PageWrapper>
		<MessageResultPage {...props} />
	</PageWrapper>
);
export const AllPublic = Primary.bind({});
export const AllPrivate = Primary.bind({});
export const PrivateSolution = Primary.bind({});
export const ManyFromSameAuthor = Primary.bind({});

const defaultMessage: MessageResultPageProps = {
	messages: [
		mockMessageWithDiscordAccount({
			id: '1',
			solutionIds: ['4'],
			public: false,
			content: ' THis is the first private message',
		}),
		mockMessageWithDiscordAccount({
			id: '2',
			content: 'This is the first public message',
		}),
		mockMessageWithDiscordAccount({
			id: '3',
			public: false,
			content: 'This is the second private message',
		}),
		mockMessageWithDiscordAccount({
			id: '4',
			public: false,
			content: 'This is the third private message',
		}),
		mockMessageWithDiscordAccount({
			id: '5',
			content: 'This is the second public message',
		}),
	],
	requestedId: '1',
	channel: mockChannelWithSettings(),
	server: { ...mockPublicServer(), id: '83730679338106880' },
};

Primary.args = defaultMessage;

AllPublic.args = {
	...defaultMessage,
	messages: [
		mockMessageWithDiscordAccount({
			id: '1',
			solutionIds: ['4'],
			content: ' THis is the first public message',
		}),
		mockMessageWithDiscordAccount({
			id: '2',
			content: `This is the second public message with a code block \`\`\`ts
const foo = "bar"\`\`\``,
		}),
		mockMessageWithDiscordAccount({
			id: '3',
			content: 'This is the third public message with an attached image',
			attachments: [
				{
					id: '1',
					filename: 'mark_solution_instructions.png',
					size: 700,
					proxyUrl:
						'https://media.discordapp.net/attachments/1020132770862874704/1025906507549790208/mark_solution_instructions.png',
					url: 'https://media.discordapp.net/attachments/1020132770862874704/1025906507549790208/mark_solution_instructions.png',
				},
			],
		}),
		mockMessageWithDiscordAccount({
			id: '4',
			content: 'This is the forth public message',
		}),
		mockMessageWithDiscordAccount({
			id: '5',
			content: 'This is the fifth public message',
		}),
		mockMessageWithDiscordAccount({
			id: '6',
			content: 'This is the sixth public message',
		}),
	],
};

AllPrivate.args = {
	...defaultMessage,
	messages: [
		mockMessageWithDiscordAccount({
			id: '1',
			solutionIds: ['4'],
			public: false,
			content: ' THis is the first private message',
		}),
		mockMessageWithDiscordAccount({
			id: '2',
			public: false,
			content: 'This is the first private message',
		}),
		mockMessageWithDiscordAccount({
			id: '3',
			public: false,
			content: 'This is the second private message',
		}),
		mockMessageWithDiscordAccount({
			id: '4',
			public: false,
			content: 'This is the third private message',
		}),
		mockMessageWithDiscordAccount({
			id: '5',
			public: false,
			content: 'This is the second private message',
		}),
	],
};

PrivateSolution.args = {
	...defaultMessage,
	messages: [
		mockMessageWithDiscordAccount({
			id: '1',
			solutionIds: ['4'],
			public: true,
		}),
		mockMessageWithDiscordAccount({
			id: '2',
			public: true,
		}),
		mockMessageWithDiscordAccount({
			id: '3',
			public: true,
		}),
		mockMessageWithDiscordAccount({
			id: '4',
			public: false,
		}),
		mockMessageWithDiscordAccount({
			id: '5',
			public: true,
		}),
	],
};

ManyFromSameAuthor.args = {
	...defaultMessage,
	messages: [
		mockMessageWithDiscordAccount({
			id: '1',
			solutionIds: ['4'],
			public: true,
			author: {
				id: '1',
				name: 'John Doe',
				avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
			},
		}),
		mockMessageWithDiscordAccount({
			id: '2',
			public: true,
			author: {
				id: '1',
				name: 'John Doe',
				avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
			},
		}),
		mockMessageWithDiscordAccount({
			id: '3',
			public: true,
		}),
		mockMessageWithDiscordAccount({
			id: '4',
			public: true,
			author: {
				id: '1',
				name: 'John Doe',
				avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
			},
		}),
		mockMessageWithDiscordAccount({
			id: '5',
			public: true,
			author: {
				id: '1',
				name: 'John Doe',
				avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
			},
		}),
		mockMessageWithDiscordAccount({
			id: '6',
			public: true,
			author: {
				id: '1',
				name: 'John Doe',
				avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
			},
		}),
	],
};
