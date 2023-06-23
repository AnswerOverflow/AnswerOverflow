import {
	AOHead,
	Heading,
	ManageServerCard,
	SignInButton,
} from '~ui/components/primitives';
import { useSession } from 'next-auth/react';
import { trpc } from '~ui/utils/trpc';
import { WaitingToBeAdded } from './Pages';
import { useState } from 'react';
import React from 'react';
import type { ServerPublic } from '@answeroverflow/api';

const WelcomePage = () => {
	const { goToPage, setData } = useOnboardingContext();
	const session = useSession();
	const { data: servers } = trpc.auth.getServersForOnboarding.useQuery(
		undefined,
		{
			enabled: session.status === 'authenticated',
		},
	);

	switch (session.status) {
		case 'authenticated':
			return (
				<div>
					<Heading.H1 className="py-8 text-4xl">
						Select a server to get started
					</Heading.H1>
					<div className="grid max-h-vh60 max-w-4xl grid-cols-3 gap-16 overflow-y-scroll p-8 ">
						{servers?.map((server) => (
							<div key={server.id}>
								<ManageServerCard
									server={{
										...server,
										description: null,
										vanityUrl: null,
										kickedTime: null,
									}}
									onSetupClick={(clickedServer) => {
										// wait a second then go this page:
										setData({
											server: clickedServer,
										});
										setTimeout(() => {
											goToPage('waiting-to-be-added');
										}, 1000);
									}}
								/>
							</div>
						))}
					</div>
				</div>
			);
		case 'loading':
			return <div />;
		case 'unauthenticated':
			return (
				<div>
					<Heading.H1 className="text-4xl">
						Welcome to Answer Overflow!
					</Heading.H1>
					<Heading.H2 className="text-2xl">
						{"Let's"} get you signed in
					</Heading.H2>
					<SignInButton />
				</div>
			);
	}
};

const pages = ['start', 'waiting-to-be-added'] as const;
type OnboardingPage = (typeof pages)[number];

const pageLookup: Record<OnboardingPage, React.FC> = {
	start: WelcomePage,
	'waiting-to-be-added': WaitingToBeAdded,
};

type SubmittedData = {
	server?: ServerPublic & {
		highestRole: 'Owner' | 'Administrator' | 'Manage Guild';
		hasBot: boolean;
	};
};

type OnboardingData = {
	goToPage: (page: OnboardingPage) => void;
	data: SubmittedData;
	setData: (data: SubmittedData) => void;
};
// eslint-disable-next-line @typescript-eslint/naming-convention
const OnboardingContext = React.createContext<OnboardingData | null>(null);

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
			<div className="flex h-screen flex-col items-center justify-center text-center">
				<OnboardingContext.Provider
					value={{
						goToPage: setCurrentPage,
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
