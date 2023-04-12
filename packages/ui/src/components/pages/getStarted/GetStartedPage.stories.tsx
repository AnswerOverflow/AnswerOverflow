import type { Meta, StoryObj } from '@storybook/react';

import { GetStartedPage } from './GetStartedPage';
import {
	AllPageIndex,
	getStartedPages,
} from './getStartedPage/GetStartedSectionPages';
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
			options: getStartedPages.map((page) => page.pageIndex),
		},
	},
} as Meta<typeof GetStartedPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GetStartedPageStory: Story = {
	args: {
		initialPageIndex: 'introPage',
	} satisfies {
		initialPageIndex: AllPageIndex;
	},
};

export const PickPlanStory: Story = {
	name: 'Plan page',
	args: {
		initialPageIndex: 'pickPlanPage',
	} satisfies {
		initialPageIndex: AllPageIndex;
	},
};

export const AddToServerPage: Story = {
	name: 'Add to server page',
	args: {
		initialPageIndex: 'addToServerPage',
	} satisfies {
		initialPageIndex: AllPageIndex;
	},
};
