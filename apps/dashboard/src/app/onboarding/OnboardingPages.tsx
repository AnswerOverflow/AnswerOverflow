import { ServerPublic } from '@answeroverflow/api/router/types';
import { ManageServerCard } from '@answeroverflow/ui/server-card';
import { ServerIcon } from '@answeroverflow/ui/server-icon';
import { Heading } from '@answeroverflow/ui/ui/heading';
import { LinkButton } from '@answeroverflow/ui/ui/link-button';
import { trpc } from '@answeroverflow/ui/utils/client';
import { signOut } from 'next-auth/react';
import posthog from 'posthog-js';
import React, { useEffect, useState } from 'react';

export type SubmittedData = {
	server?: ServerPublic & {
		highestRole: 'Owner' | 'Administrator' | 'Manage Guild';
		hasBot: boolean;
	};
	communityType?: 'Commercial' | 'Non-Commercial';
	communityTopic?: 'Gaming' | 'Education' | 'Software' | 'Other';
};

export type OnboardingData = {
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

export const pages = ['start', 'waiting-to-be-added'] as const;
export type OnboardingPage = (typeof pages)[number];
export const pageLookup: Record<OnboardingPage, React.FC> = {
	start: WelcomePage,
	'waiting-to-be-added': WaitingToBeAdded,
};
export function WaitingToBeAdded() {
	const { data } = useOnboardingContext();
	const [lastChecked, setLastChecked] = useState(Date.now());
	const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());

	const { status } = trpc.servers.byId.useQuery(data.server!.id, {
		refetchInterval: 5000,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		onError() {
			setLastChecked(Date.now());
		},
		onSuccess() {
			setLastChecked(Date.now());
		},
	});

	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentTimestamp(Date.now());
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, []);

	const secondsSinceLastChecked = Math.floor(
		(currentTimestamp - lastChecked) / 1000,
	);

	return (
		<WaitingToBeAddedRenderer
			server={data.server!}
			timeSinceLastCheckInSeconds={
				secondsSinceLastChecked > 0 ? secondsSinceLastChecked : 0
			}
			hasJoined={status === 'success'}
		/>
	);
}

export function WaitingToBeAddedRenderer(props: {
	server: ServerPublic;
	timeSinceLastCheckInSeconds: number;
	hasJoined: boolean;
}) {
	const { goToPage } = useOnboardingContext();
	if (props.hasJoined) {
		return (
			<div className="flex flex-col items-center justify-center gap-8 text-center">
				<Heading.H1>Joined {props.server.name}!</Heading.H1>
				<ServerIcon size={128} server={props.server} />
				<LinkButton href={`/dashboard/${props.server.id}`} size={'lg'}>
					Continue
				</LinkButton>
			</div>
		);
	}
	return (
		<div className="flex flex-col items-center justify-center gap-8 text-center">
			<Heading.H1>Waiting to join {props.server.name}</Heading.H1>
			<div className="h-32 w-32 animate-spin rounded-full border-b-4 border-highlight" />
			<span>
				Last checked {props.timeSinceLastCheckInSeconds} second
				{props.timeSinceLastCheckInSeconds === 1 ? '' : 's'} ago.
			</span>
		</div>
	);
}

export function WelcomePage() {
	const session = trpc.auth.getSession.useQuery();
	const { data: servers } = trpc.auth.getServersForOnboarding.useQuery(
		undefined,
		{
			onError: (err) => {
				if (err.data?.code === 'UNAUTHORIZED') {
					void signOut();
				}
			},
		},
	);
	return (
		<WelcomePageRenderer
			authState={
				session.isLoading
					? 'loading'
					: session.data
						? 'authenticated'
						: 'unauthenticated'
			}
			servers={servers}
		/>
	);
}

export function WelcomePageRenderer(props: {
	authState: 'authenticated' | 'unauthenticated' | 'loading';
	servers?: {
		highestRole: 'Administrator' | 'Manage Guild' | 'Owner';
		hasBot: boolean;
		id: string;
		name: string;
		icon: string | null;
		owner: boolean;
		permissions: number;
		features: string[];
	}[];
}) {
	const { goToPage, setData } = useOnboardingContext();
	useEffect(() => {
		posthog.startSessionRecording();
	}, []);

	switch (props.authState) {
		case 'authenticated':
			return (
				<div>
					<Heading.H1 className="py-8 text-4xl">
						Select a server to get started
					</Heading.H1>
					<div className="grid max-h-vh60 max-w-4xl grid-cols-1 gap-16 overflow-y-scroll p-8 md:grid-cols-3">
						{props.servers?.map((server) => (
							<div key={server.id}>
								<ManageServerCard
									server={{
										...server,
										description: null,
										vanityUrl: null,
										vanityInviteCode: null,
										kickedTime: null,
										customDomain: null,
										approximateMemberCount: 0,
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
					<Heading.H2 className="py-8 text-2xl">
						{"Let's"} get you signed in
					</Heading.H2>
					<LinkButton
						className="w-64"
						href={
							// eslint-disable-next-line n/no-process-env
							(process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local'
								? 'http://localhost:3000/'
								: 'https://www.answeroverflow.com/') + `app-auth`
						}
						variant="default"
					>
						Sign In
					</LinkButton>
				</div>
			);
	}
}
