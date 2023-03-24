import type { Meta, StoryObj } from '@storybook/react';
import { mockDiscordAccount } from '~ui/test/props';
import { DiscordAvatar } from './DiscordAvatar';
const meta = {
	component: DiscordAvatar,
} as Meta<typeof DiscordAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

//👇 Each story then reuses that template
export const Primary: Story = {
	args: {
		size: 'md',
		user: mockDiscordAccount(),
	},
};

export const WithImage: Story = {
	args: {
		size: 'md',
		user: mockDiscordAccount({
			avatar: '7716e305f7de26045526d9da6eef2dab',
			id: '523949187663134754',
		}),
	},
};
