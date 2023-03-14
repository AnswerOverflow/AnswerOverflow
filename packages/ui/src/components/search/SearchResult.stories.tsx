import type { APISearchResult } from '@answeroverflow/api';
import type { Meta, StoryObj } from '@storybook/react';
import {
	mockChannelWithSettings,
	mockMessageWithDiscordAccount,
	mockServer,
} from '~ui/test/props';
import { SearchResultWrapper } from './SearchResult';

const meta = {
	component: SearchResultWrapper,
	argTypes: {},
} as Meta<typeof SearchResultWrapper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
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
			<SearchResultWrapper result={result} />
		</div>
	),
};
