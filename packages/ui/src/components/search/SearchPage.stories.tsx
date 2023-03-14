import type { Meta, StoryObj } from '@storybook/react';
import {
	mockChannelWithSettings,
	mockMessageWithDiscordAccount,
	mockServer,
} from '~ui/test/props';
import { PageWrapper } from '../PageWrapper';
import { SearchPage } from './SearchPage';

const meta = {
	component: SearchPage,
	title: 'pages/SearchPage',
	argTypes: {},
	render: (args) => (
		<PageWrapper>
			<SearchPage {...args} />
		</PageWrapper>
	),
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
} as Meta<typeof SearchPage>;

export default meta;
type Story = StoryObj<typeof meta>;
export const NoResults: Story = {};
export const Results: Story = {
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
				channel: mockChannelWithSettings(),
				server: mockServer(),
			},
		],
		isLoading: false,
	},
};
export const Loading: Story = {
	args: {
		isLoading: true,
	},
};
