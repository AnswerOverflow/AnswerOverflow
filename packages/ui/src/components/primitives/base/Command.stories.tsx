import type { Meta, StoryObj } from '@storybook/react';

import { Command } from './Command';
const meta = {
	component: Command,
} as Meta<typeof Command>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CommandPrimary: Story = {
	args: {
		command: 'answeroverflow',
	},
};
