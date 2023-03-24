import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';
const meta = {
	component: Button,
	render: (args) => <Button {...args}>Text</Button>,
} as Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
	args: {
		variant: 'default',
	},
};

export const Destructive: Story = {
	args: {
		variant: 'destructive',
	},
};

export const Outline: Story = {
	args: {
		variant: 'outline',
	},
};

export const Subtle: Story = {
	args: {
		variant: 'subtle',
	},
};

export const Ghost: Story = {
	args: {
		variant: 'ghost',
	},
};
