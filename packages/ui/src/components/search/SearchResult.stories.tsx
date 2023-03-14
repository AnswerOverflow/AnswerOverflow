import type { APISearchResult } from '@answeroverflow/api';
import type { Meta, StoryObj } from '@storybook/react';
import {
	mockChannelWithSettings,
	mockMessageWithDiscordAccount,
	mockServer,
} from '~ui/test/props';
import { SearchResult } from './SearchResult';

const meta = {
	component: SearchResult,
	argTypes: {},
} as Meta<typeof SearchResult>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PublicSolution: Story = {
	args: {
		result: {
			message: {
				...mockMessageWithDiscordAccount(),
				solutionMessages: [mockMessageWithDiscordAccount()],
				referencedMessage: mockMessageWithDiscordAccount(),
			},
			thread: mockChannelWithSettings(),
			score: 0.5,
			channel: mockChannelWithSettings(),
			server: mockServer(),
		},
	},
	render: ({ result }: { result: APISearchResult[number] }) => (
		<div className="xl:w-2/3">
			<SearchResult result={result} />
		</div>
	),
};

export const PrivateSolution: Story = {
	args: {
		result: {
			message: {
				...mockMessageWithDiscordAccount(),
				solutionMessages: [
					{
						...mockMessageWithDiscordAccount(),
						public: false,
					},
				],
				referencedMessage: mockMessageWithDiscordAccount(),
			},
			thread: mockChannelWithSettings(),
			score: 0.5,
			channel: mockChannelWithSettings(),
			server: mockServer(),
		},
	},
	render: ({ result }: { result: APISearchResult[number] }) => (
		<div className="xl:w-2/3">
			<SearchResult result={result} />
		</div>
	),
};

export const NoSolution: Story = {
	args: {
		result: {
			message: {
				...mockMessageWithDiscordAccount(),
				solutionMessages: [],
				referencedMessage: mockMessageWithDiscordAccount(),
			},
			thread: mockChannelWithSettings(),
			score: 0.5,
			channel: mockChannelWithSettings(),
			server: mockServer(),
		},
	},
	render: ({ result }: { result: APISearchResult[number] }) => (
		<div className="xl:w-2/3">
			<SearchResult result={result} />
		</div>
	),
};
