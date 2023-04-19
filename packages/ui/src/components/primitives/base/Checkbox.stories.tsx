import type { Meta, StoryObj } from '@storybook/react';

import { Checkbox } from './Checkbox';
const meta = {
	component: Checkbox,
} as Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CheckboxStory: Story = {
	name: 'Checkbox',
	args: {},
};
