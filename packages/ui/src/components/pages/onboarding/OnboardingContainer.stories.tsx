import type { Meta, StoryObj } from '@storybook/react';

import { OnboardingContext, OnboardingLanding } from './OnboardingContainer';
import {
	EnableForumGuidelinesConsent,
	EnableIndexingPage,
	EnableMarkSolution,
	FinalChecklistPage,
	WaitingToBeAddedRenderer,
	WelcomePageRenderer,
	WhatIsYourCommunityAbout,
	WhatTypeOfCommunityDoYouHave,
} from './OnboardingPages';
import { mockServer } from '~ui/test/props';
const meta = {
	component: OnboardingLanding,
} as Meta<typeof OnboardingLanding>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContributorsStory: Story = {
	args: {},
};

export const SignInStory: Story = {
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
				<WelcomePageRenderer authState="unauthenticated" />
			</OnboardingContext.Provider>
		</div>
	),
};

export const SignedInStory: Story = {
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
				<WelcomePageRenderer
					authState="authenticated"
					servers={[
						{
							...mockServer(),
							highestRole: 'Owner',
							hasBot: true,
							permissions: 0,
							features: [],
							owner: true,
						},
						{
							...mockServer(),
							highestRole: 'Owner',
							hasBot: true,
							permissions: 0,
							features: [],
							owner: true,
						},
						{
							...mockServer(),
							highestRole: 'Owner',
							hasBot: true,
							permissions: 0,
							features: [],
							owner: true,
						},
						{
							...mockServer(),
							highestRole: 'Owner',
							hasBot: true,
							permissions: 0,
							features: [],
							owner: true,
						},
						{
							...mockServer(),
							highestRole: 'Owner',
							hasBot: true,
							permissions: 0,
							features: [],
							owner: true,
						},
						{
							...mockServer(),
							highestRole: 'Owner',
							hasBot: true,
							permissions: 0,
							features: [],
							owner: true,
						},
						{
							...mockServer(),
							highestRole: 'Owner',
							hasBot: true,
							permissions: 0,
							features: [],
							owner: true,
						},
					]}
				/>
			</OnboardingContext.Provider>
		</div>
	),
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

export const FinalChecklistPageStory: Story = {
	render: () => (
		<div className="flex min-h-screen flex-col items-center justify-center text-center">
			<OnboardingContext.Provider
				value={{
					goToPage: () => {},
					data: {
						server: {
							...mockServer(),
							hasBot: true,
							highestRole: 'Administrator',
						},
					},
					setData: () => {},
				}}
			>
				<FinalChecklistPage />
			</OnboardingContext.Provider>
		</div>
	),
};
