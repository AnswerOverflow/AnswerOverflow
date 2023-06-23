import type { Meta, StoryObj } from '@storybook/react';

import { OnboardingLanding } from './OnboardingLanding';
import { WaitingToBeAddedRenderer } from './Pages';
import { mockServer } from '~ui/test/props';
const meta = {
	component: OnboardingLanding,
} as Meta<typeof OnboardingLanding>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContributorsStory: Story = {
	args: {},
};

export const WaitingToBeAddedStory: Story = {
	render: () => (
		<div className="flex h-screen flex-col items-center justify-center text-center">
			<WaitingToBeAddedRenderer
				server={mockServer()}
				timeSinceLastCheckInSeconds={5}
				hasJoined={false}
			/>
		</div>
	),
};

export const SuccessfullyJoinedStory: Story = {
	render: () => (
		<div className="flex h-screen flex-col items-center justify-center text-center">
			<WaitingToBeAddedRenderer
				server={mockServer()}
				timeSinceLastCheckInSeconds={5}
				hasJoined={true}
			/>
		</div>
	),
};
