import type { Meta, StoryObj } from '@storybook/react';

import { OnboardingLanding } from './OnboardingLanding';
const meta = {
	component: OnboardingLanding,
} as Meta<typeof OnboardingLanding>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContributorsStory: Story = {
	args: {
	},
};
