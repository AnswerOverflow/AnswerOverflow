import type { Meta, StoryObj } from '@storybook/react';

import { Contributors } from './Contributors';
const meta = {
	component: Contributors,
} as Meta<typeof Contributors>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContributorsStory: Story = {
	args: {
		contributors: [
			{
				avatar: 'https://avatars.githubusercontent.com/u/9919?s=200&v=4',
				description: 'User description',
				name: 'User name',
				links: ['http://localhost:3000/contributors'],
			},
		],
	},
};
