import type { Meta, StoryObj } from '@storybook/react';

import { GetStartedPage } from './GetStartedPage';
const meta = {
	component: GetStartedPage,
	render: (props) => <GetStartedPage {...props} />,
	parameters: {
		layout: 'fullscreen',
	},
	argTypes: {
		initialPageIndex: {
			control: {
				type: 'radio',
			},
			options: ['introPage', 'pickPlanPage'],
		},
	},
} as Meta<typeof GetStartedPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GetStartedPageStory: Story = {
	args: {
		initialPageIndex: 'introPage',
	},
};

export const PickPlanStory: Story = {
	name: 'Plan page',
	args: {
		initialPageIndex: 'pickPlanPage',
	},
};
