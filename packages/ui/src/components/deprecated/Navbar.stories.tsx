import type { Meta, StoryObj } from '@storybook/react';

import { Navbar } from './Navbar';
const meta = {
	title: 'Deprecated/Navbar',
	component: Navbar,
} as Meta<typeof Navbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
