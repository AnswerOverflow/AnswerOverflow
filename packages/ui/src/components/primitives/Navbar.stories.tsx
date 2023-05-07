import type { Meta, StoryObj } from '@storybook/react';

import { NavbarRenderer } from './Navbar';
const meta = {
	component: NavbarRenderer,
} as Meta<typeof NavbarRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotSignedIn: Story = {
	args: {
		path: '/',
	},
};

export const SignedIn: Story = {
	args: {
		path: '/',
		user: {
			id: '123',
		},
	},
};
