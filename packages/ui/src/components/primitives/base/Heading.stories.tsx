import type { Meta, StoryObj } from '@storybook/react';

import { Heading } from './Heading';
const meta = {
	component: Heading.H1,
} as Meta<typeof Heading.H1>;

export default meta;

type Story = StoryObj<typeof meta>;

export const H1: Story = {
	name: 'H1',
	render: () => <Heading.H1>H1 Heading</Heading.H1>,
	args: {},
};

export const H2: Story = {
	name: 'H2',
	render: () => <Heading.H2>H2 Heading</Heading.H2>,
	args: {},
};

export const H3: Story = {
	name: 'H3',
	render: () => <Heading.H3>H3 Heading</Heading.H3>,
	args: {},
};

export const H4: Story = {
	name: 'H4',
	render: () => <Heading.H4>H4 Heading</Heading.H4>,
	args: {},
};

export const H5: Story = {
	name: 'H5',
	render: () => <Heading.H5>H5 Heading</Heading.H5>,
	args: {},
};

export const H6: Story = {
	name: 'H6',
	render: () => <Heading.H6>H6 Heading</Heading.H6>,
	args: {},
};
