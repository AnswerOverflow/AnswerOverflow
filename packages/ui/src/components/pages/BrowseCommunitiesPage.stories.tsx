import type { Meta, StoryObj } from '@storybook/react';

import { BrowseCommunitiesRenderer } from './BrowseCommunitiesPage';
import { mockServer } from '~ui/test/props';
import { PageWrapper } from './PageWrapper';
const meta = {
	component: BrowseCommunitiesRenderer,
	parameters: {
		layout: 'fullscreen',
	},
	render: (args) => (
		<PageWrapper>
			<BrowseCommunitiesRenderer {...args} />
		</PageWrapper>
	),
} as Meta<typeof BrowseCommunitiesRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

// Mock 10 servers
const servers = Array.from({ length: 10 }, () => mockServer());

export const Primary: Story = {
	args: {
		servers: servers,
	},
};
