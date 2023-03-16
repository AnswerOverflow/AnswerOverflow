import type { Meta, StoryObj } from '@storybook/react';

import { Pricing } from './Pricing';
const meta = {
	component: Pricing,
} as Meta;

export default meta;

type Story = StoryObj<typeof meta>;
export const Primary: Story = {
	args: {},
};
