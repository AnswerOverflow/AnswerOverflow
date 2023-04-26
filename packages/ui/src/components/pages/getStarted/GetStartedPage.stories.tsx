import type { Meta, StoryObj } from '@storybook/react';

import { GetStartedPage } from './GetStartedPage';
import {
	type AllPageIndex,
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

export const AddToServerOauthPage: Story = {
	name: 'Add to server oauth page',
	args: {
		initialPageIndex: 'addBotToServerOauth',
	} satisfies {
		initialPageIndex: AllPageIndex;
	},
};

export const ChannelSettingsPage: Story = {
	name: 'Channel settings page',
	args: {
		initialPageIndex: 'channelSettingsPage',
	} satisfies {
		initialPageIndex: AllPageIndex;
	},
};

export const ServerSettingsPage: Story = {
	name: 'Server settings page',
	args: {
		initialPageIndex: 'serverSettingsPage',
	} satisfies {
		initialPageIndex: AllPageIndex;
	},
};

export const CompletePage: Story = {
	name: 'Complete page',
	args: {
		initialPageIndex: 'completePage',
	} satisfies {
		initialPageIndex: AllPageIndex;
	},
};
