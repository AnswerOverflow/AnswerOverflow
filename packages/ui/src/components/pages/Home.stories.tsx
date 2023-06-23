import type { Meta, StoryObj } from '@storybook/react';
import { Home } from './Home';
import { mockServer } from '~ui/test/props';

const meta = {
	component: Home,
	render: (args) => <Home {...args} />,
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
} as Meta<typeof Home>;

export default meta;
type Story = StoryObj<typeof meta>;

const servers = Array.from({ length: 32 }, () => mockServer());

export const Homepage: Story = {

  args: {
    servers: servers,
  }
};
