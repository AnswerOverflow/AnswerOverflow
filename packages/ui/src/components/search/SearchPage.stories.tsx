import type { Meta, StoryObj } from '@storybook/react';
import { SearchPage } from './SearchPage';

const meta = {
	component: SearchPage,
	title: 'pages/SearchPage',
	parameters: {
		layout: 'fullscreen',
		a11y: {
			config: {
				rules: [
					{
						id: 'heading-order',
						enabled: false,
					},
					{
						id: 'duplicate-id',
						enabled: false,
					},
				],
			},
		},
	},
} as Meta<typeof SearchPage>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Searchpage: Story = {};
