import type { Meta, StoryObj } from '@storybook/react';

import { OnboardingContext, OnboardingLanding } from './OnboardingLanding';
import {
	EnableForumGuidelinesConsent,
	EnableIndexingPage,
	EnableMarkSolution,
	WaitingToBeAddedRenderer,
	WhatIsYourCommunityAbout,
	WhatTypeOfCommunityDoYouHave,
} from './Pages';
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
		<div className="flex min-h-screen flex-col items-center justify-center text-center">
			<OnboardingContext.Provider
				value={{
					goToPage: () => {},
					data: {
						server: undefined,
					},
					setData: () => {},
				}}
			>
				<WaitingToBeAddedRenderer
					server={mockServer()}
					timeSinceLastCheckInSeconds={5}
					hasJoined={false}
				/>
			</OnboardingContext.Provider>
		</div>
	),
};

export const SuccessfullyJoinedStory: Story = {
	render: () => (
		<div className="flex min-h-screen flex-col items-center justify-center text-center">
			<OnboardingContext.Provider
				value={{
					goToPage: () => {},
					data: {
						server: undefined,
					},
					setData: () => {},
				}}
			>
				<WaitingToBeAddedRenderer
					server={mockServer()}
					timeSinceLastCheckInSeconds={5}
					hasJoined={true}
				/>
			</OnboardingContext.Provider>
		</div>
	),
};

export const WhatIsYourCommunityAboutStory: Story = {
	render: () => (
		<div className="flex min-h-screen flex-col items-center justify-center text-center">
			<OnboardingContext.Provider
				value={{
					goToPage: () => {},
					data: {
						server: undefined,
					},
					setData: () => {},
				}}
			>
				<WhatIsYourCommunityAbout />
			</OnboardingContext.Provider>
		</div>
	),
};

export const WhatTypeOfCommunityDoYouHaveStory: Story = {
	render: () => (
		<div className="flex min-h-screen flex-col items-center justify-center text-center">
			<OnboardingContext.Provider
				value={{
					goToPage: () => {},
					data: {
						server: undefined,
					},
					setData: () => {},
				}}
			>
				<WhatTypeOfCommunityDoYouHave />
			</OnboardingContext.Provider>
		</div>
	),
};

export const EnablingIndexingStory: Story = {
	render: () => (
		<div className="flex min-h-screen flex-col items-center justify-center text-center">
			<OnboardingContext.Provider
				value={{
					goToPage: () => {},
					data: {
						server: undefined,
					},
					setData: () => {},
				}}
			>
				<EnableIndexingPage />
			</OnboardingContext.Provider>
		</div>
	),
};

export const EnableForumGuidelinesConsentStory: Story = {
	render: () => (
		<div className="flex min-h-screen flex-col items-center justify-center text-center">
			<OnboardingContext.Provider
				value={{
					goToPage: () => {},
					data: {
						server: undefined,
					},
					setData: () => {},
				}}
			>
				<EnableForumGuidelinesConsent />
			</OnboardingContext.Provider>
		</div>
	),
};

export const EnableMarkSolutionStory: Story = {
	render: () => (
		<div className="flex min-h-screen flex-col items-center justify-center text-center">
			<OnboardingContext.Provider
				value={{
					goToPage: () => {},
					data: {
						server: undefined,
					},
					setData: () => {},
				}}
			>
				<EnableMarkSolution />
			</OnboardingContext.Provider>
		</div>
	),
};
