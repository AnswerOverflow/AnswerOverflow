'use client';
import React, { useState } from 'react';
import {
	OnboardingContext,
	OnboardingPage,
	pageLookup,
	SubmittedData,
} from './onboarding/OnboardingPages';
import { trackEvent } from '@answeroverflow/hooks/src/analytics/events';

export default function Onboarding() {
	// Eventually move this into the url
	const [currentPage, setCurrentPage] = useState<OnboardingPage>('start');
	const [data, setData] = useState<SubmittedData>({});
	const Page = pageLookup[currentPage];
	return (
		<>
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
}
