'use client';
import { trackEvent } from '@answeroverflow/ui/hooks/events';
import React, { useState } from 'react';
import {
	OnboardingContext,
	OnboardingPage,
	SubmittedData,
	pageLookup,
} from './OnboardingPages';
import { usePostHog } from '@answeroverflow/ui/hooks/use-posthog';

export default function Onboarding() {
	// Eventually move this into the url
	const [currentPage, setCurrentPage] = useState<OnboardingPage>('start');
	const [data, setData] = useState<SubmittedData>({});
	const posthog = usePostHog();
	const Page = pageLookup[currentPage];
	return (
		<>
			<div className="flex min-h-screen flex-col items-center justify-center text-center">
				<OnboardingContext.Provider
					value={{
						goToPage: (page) => {
							trackEvent(
								`Onboarding Page View - ${page}`,
								{
									'Page Name': page,
									'Server Id': data.server?.id ?? '',
									'Server Name': data.server?.name ?? '',
									'Community Topic': data.communityTopic,
									'Community Type': data.communityType,
								},
								posthog,
							);
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
