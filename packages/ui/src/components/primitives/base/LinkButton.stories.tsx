import type { Meta, StoryObj } from '@storybook/react';

import { LinkButton } from './LinkButton';
const meta = {
	component: LinkButton,
	render: (args) => <LinkButton {...args}>Text</LinkButton>,
} as Meta<typeof LinkButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LinkButtonStory: Story = {
	args: {
		variant: 'default',
		href: 'https://answeroverflow.com',
	},
};
