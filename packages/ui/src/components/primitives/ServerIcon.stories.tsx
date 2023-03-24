import type { Meta, StoryObj } from '@storybook/react';
import { ServerIcon } from './ServerIcon';
import { mockServer } from '~ui/test/props';
const meta = {
	component: ServerIcon,
} as Meta<typeof ServerIcon>;

export default meta;

type Story = StoryObj<typeof meta>;
export const Primary: Story = {
	args: {
		server: mockServer(),
	},
};

export const WithImage: Story = {
	args: {
		server: mockServer({
			name: 'AnswerOverflow',
			id: '952724385238761475',
			icon: '4e610bdea5aacf259013ed8cada0bc1d',
		}),
	},
};

export const Tertiary: Story = {
	args: {
		...Primary.args,
	},
};
