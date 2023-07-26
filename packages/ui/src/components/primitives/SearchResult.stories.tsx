import type { Story } from '@ladle/react';
import { loremIpsum } from 'lorem-ipsum';
import {
	mockChannelWithSettings,
	mockMessageWithDiscordAccount,
	mockPublicServer,
} from '~ui/test/props';
import { SearchResult } from './SearchResult';

type SearchResultProps = React.ComponentPropsWithoutRef<typeof SearchResult>;

export const PublicSolution: Story<SearchResultProps> = (props) => (
	<div className="xl:w-2/3">
		<SearchResult {...props} />
	</div>
);

PublicSolution.args = {
	result: {
		message: {
			...mockMessageWithDiscordAccount(),
			solutionMessages: [mockMessageWithDiscordAccount()],
			referencedMessage: mockMessageWithDiscordAccount(),
		},
		thread: mockChannelWithSettings(),
		score: 0.5,
		channel: mockChannelWithSettings({
			// AO's Discord server
			inviteCode: 'sxDN2rEdwD',
		}),
		server: mockPublicServer(),
	},
};

export const PublicSolutionWithSuperLongMessage = PublicSolution.bind({});

PublicSolutionWithSuperLongMessage.args = {
	result: {
		message: {
			...mockMessageWithDiscordAccount({
				content: loremIpsum({
					count: 250,
				}),
			}),
			solutionMessages: [mockMessageWithDiscordAccount()],
			referencedMessage: mockMessageWithDiscordAccount(),
		},
		thread: mockChannelWithSettings(),
		score: 0.5,
		channel: mockChannelWithSettings({
			// AO's Discord server
			inviteCode: 'sxDN2rEdwD',
		}),
		server: mockPublicServer(),
	},
};

export const PrivateSolution = PublicSolution.bind({});

PrivateSolution.args = {
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
		channel: mockChannelWithSettings({
			// AO's Discord server
			inviteCode: 'sxDN2rEdwD',
		}),
		server: mockPublicServer(),
	},
};

export const PrivateResult = PublicSolution.bind({});

PrivateResult.args = {
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
			public: false,
		},
		thread: mockChannelWithSettings(),
		score: 0.5,
		channel: mockChannelWithSettings({
			// AO's Discord server
			inviteCode: 'sxDN2rEdwD',
		}),
		server: mockPublicServer(),
	},
};

export const NoSolution = PublicSolution.bind({});
NoSolution.args = {
	result: {
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
		server: mockPublicServer(),
	},
};
