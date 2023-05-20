import type { Meta, StoryObj } from '@storybook/react';
import { loremIpsum } from 'lorem-ipsum';
import {
	mockChannelWithSettings,
	mockMessageWithDiscordAccount,
	mockServer,
} from '~ui/test/props';
import { PageWrapper } from './PageWrapper';
import { SearchPage } from './SearchPage';

const meta = {
	component: SearchPage,
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
				channel: mockChannelWithSettings({
					// AO's Discord server
					inviteCode: 'sxDN2rEdwD',
				}),
				server: mockServer(),
			},
		],
		isLoading: false,
	},
};

export const ResultsWithSuperLongMessage: Story = {
	args: {
		results: [
			{
				message: {
					...mockMessageWithDiscordAccount({
						content: loremIpsum({
							count: 250,
						}),
					}),
					solutionMessages: [],
					referencedMessage: mockMessageWithDiscordAccount(),
				},
				thread: mockChannelWithSettings(),
				score: 0.5,
				channel: mockChannelWithSettings({
					// AO's Discord server
					inviteCode: 'sxDN2rEdwD',
				}),
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
