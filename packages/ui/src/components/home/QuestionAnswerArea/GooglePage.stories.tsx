import type { Meta, StoryObj } from '@storybook/react';

import { GooglePage } from './GooglePage/GooglePage';
const meta = {
	component: GooglePage,
} as Meta<typeof GooglePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
	args: {
		result: {
			url: 'https://www.answeroverflow.com > ...',
			title: 'How do I index my discord channels into google?',
			description: `How do I index my discord channels into google? How do I index my discord channels into google? How do I index my discord channels into google?`,
		},
	},
};
