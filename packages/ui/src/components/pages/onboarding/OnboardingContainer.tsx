import { AOHead } from '~ui/components/primitives';
import { pageLookup, type OnboardingPage } from './OnboardingPages';
import { useState } from 'react';
import React from 'react';
import type { ServerPublic } from '@answeroverflow/api';
import { trackEvent } from '@answeroverflow/hooks';

type SubmittedData = {
	server?: ServerPublic & {
		highestRole: 'Owner' | 'Administrator' | 'Manage Guild';
		hasBot: boolean;
	};
	communityType?: 'Commercial' | 'Non-Commercial';
	communityTopic?: 'Gaming' | 'Education' | 'Software' | 'Other';
};

type OnboardingData = {
	goToPage: (page: OnboardingPage) => void;
	data: SubmittedData;
	setData: (data: SubmittedData) => void;
};
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OnboardingContext = React.createContext<OnboardingData | null>(
	null,
);

export const useOnboardingContext = () => {
	const context = React.useContext(OnboardingContext);
	if (context === null) {
		throw new Error(
			'`useOnboardingContext` must be used within a `OnboardingContext`',
		);
	}
	return context;
};

export const OnboardingLanding = () => {
	// Eventually move this into the url
	const [currentPage, setCurrentPage] = useState<OnboardingPage>('start');
	const [data, setData] = useState<SubmittedData>({});
	const Page = pageLookup[currentPage];
	return (
		<>
			<AOHead
				title="Onboarding"
				description="Browse communities on Answer Overflow."
				path="/communities"
			/>
			<div className="flex min-h-screen flex-col items-center justify-center text-center">
				<OnboardingContext.Provider
					value={{
						goToPage: (page) => {
							trackEvent(`Onboarding Page View - ${page}`, {
								'Page Name': page,
								'Server Id': data.server?.id ?? '',
								'Server Name': data.server?.name ?? '',
								'Community Topic': data.communityTopic,
								'Community Type': data.communityType,
							});
							setCurrentPage(page);
						},
						data,
						setData,
					}}
				>
					<Page />
				</OnboardingContext.Provider>
			</div>
		</>
	);
};
