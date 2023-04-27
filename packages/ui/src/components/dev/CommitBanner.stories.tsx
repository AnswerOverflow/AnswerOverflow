import type { Meta, StoryObj } from '@storybook/react';

import { CommitBannerRenderer } from './CommitBanner';
const meta = {
	component: CommitBannerRenderer,
} as Meta<typeof CommitBannerRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CommitBannerStory: Story = {
	args: {
		commitSha: '1234567890abcdef',
	},
};
