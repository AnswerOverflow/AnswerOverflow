import type { Meta, StoryObj } from '@storybook/react';

import { GetStartedPage } from './GetStartedPage';
const meta = {
	component: GetStartedPage,
	parameters: {
		layout: 'fullscreen',
	},
} as Meta<typeof GetStartedPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GetStartedPageStory: Story = {
	args: {},
};
