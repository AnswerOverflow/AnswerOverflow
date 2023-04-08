import type { Meta, StoryObj } from '@storybook/react';
import {
	mockChannelWithSettings,
	mockMessageWithDiscordAccount,
	mockServer,
} from '~ui/test/props';
import { MessageResultPage, MessageResultPageProps } from './MessageResultPage';
import { PageWrapper } from './PageWrapper';
const meta = {
	component: MessageResultPage,
	parameters: {
		layout: 'fullscreen',
		a11y: {
			config: {
				rules: [
					{
						id: 'heading-order',
						enabled: false,
					},
					{
						id: 'duplicate-id',
						enabled: false,
					},
				],
			},
		},
	},
	render: (args) => (
		<PageWrapper>
			<MessageResultPage {...args} />
		</PageWrapper>
	),
} as Meta<typeof MessageResultPage>;

export default meta;

type Story = StoryObj<typeof meta>;
//👇 Each story then reuses that template

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
	server: { ...mockServer(), id: '83730679338106880' },
};

export const Primary: Story = {
	args: defaultMessage,
};

export const AllPublic: Story = {
	args: {
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
	},
};

export const AllPrivate: Story = {
	args: {
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
	},
};

export const PrivateSolution: Story = {
	args: {
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
	},
};
