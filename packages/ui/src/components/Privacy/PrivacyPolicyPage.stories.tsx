import type { Meta, StoryObj } from '@storybook/react';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';

const meta = {
	component: PrivacyPolicyPage,
	title: 'pages/PrivacyPolicyPage',
	argTypes: {},
	render: () => <PrivacyPolicyPage />,
	parameters: {
		layout: 'fullscreen',
	},
} as Meta<typeof PrivacyPolicyPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
