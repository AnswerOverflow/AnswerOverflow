import type { Meta, StoryObj } from '@storybook/react';

import { AnswerOverflowLogo } from './Icons';
const meta = {
	component: AnswerOverflowLogo,
} as Meta<typeof AnswerOverflowLogo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AnswerOverflowLogoStory: Story = {
	name: 'Answer Overflow Logo',
	args: {},
};
