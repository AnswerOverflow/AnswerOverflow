import React, { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import {
	AcademicCapIcon,
	ChatBubbleLeftIcon,
	CheckCircleIcon,
	CodeBracketIcon,
	MagnifyingGlassCircleIcon,
} from '@heroicons/react/24/outline';
import { IoGameControllerOutline } from 'react-icons/io5';
import { MdMoneyOffCsred, MdAttachMoney } from 'react-icons/md';
import { CiCircleMore } from 'react-icons/ci';
import { trpc } from '@answeroverflow/ui/src/utils/client';
import type { ServerPublic } from '@answeroverflow/api/src/router/server/types';
import { Command } from '@answeroverflow/ui/src/ui/command';
import { Button } from '@answeroverflow/ui/src/ui/button';
import { ServerIcon } from '@answeroverflow/ui/src/server-icon';
import { Heading } from '@answeroverflow/ui/src/ui/heading';
import { BlueLink } from '@answeroverflow/ui/src/ui/blue-link';
import { ManageServerCard } from '@answeroverflow/ui/src/server-card';
import { LinkButton } from '@answeroverflow/ui/src/ui/link-button';
import posthog from 'posthog-js';

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

export const pages = [
	'start',
	'waiting-to-be-added',
	'what-type-of-community',
	'what-topic',
	'enable-indexing',
	'enable-read-the-rules-consent',
	'enable-mark-solution',
	'final-checklist',
] as const;
export type OnboardingPage = (typeof pages)[number];
export const pageLookup: Record<OnboardingPage, React.FC> = {
	start: WelcomePage,
	'waiting-to-be-added': WaitingToBeAdded,
	'what-type-of-community': WhatTypeOfCommunityDoYouHave,
	'what-topic': WhatIsYourCommunityAbout,
	'enable-indexing': EnableIndexingPage,
	'enable-read-the-rules-consent': EnableForumGuidelinesConsent,
	'enable-mark-solution': EnableMarkSolution,
	'final-checklist': FinalChecklistPage,
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
				<Button
					size={'lg'}
					onClick={() => {
						goToPage('what-topic');
					}}
				>
					Continue
				</Button>
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

function ButtonMenu(props: {
	options: {
		label: React.ReactNode;
		icon: React.ReactNode;
		value: string;
	}[];
	onSelect: (value: string) => void;
}) {
	return (
		<div className="mx-auto grid max-w-md grid-cols-1 items-center justify-items-center gap-8 py-8 md:grid-cols-2">
			{props.options.map((option) => {
				return (
					<Button
						className="grid h-32 w-32 grid-cols-1"
						key={option.value}
						onClick={() => {
							props.onSelect(option.value);
						}}
					>
						{option.icon}
						{option.label}
					</Button>
				);
			})}
		</div>
	);
}

export function WhatIsYourCommunityAbout() {
	const { goToPage, setData, data } = useOnboardingContext();
	return (
		<div>
			<Heading.H1 className="py-8 text-4xl">
				What topic best fits your community?
			</Heading.H1>
			<ButtonMenu
				options={[
					{
						label: 'Education',
						icon: <AcademicCapIcon className="mx-auto h-12 w-12" />,
						value: 'Education',
					},
					{
						label: 'Software',
						icon: <CodeBracketIcon className="mx-auto h-12 w-12" />,
						value: 'Software',
					},
					{
						label: 'Gaming',
						icon: <IoGameControllerOutline className="mx-auto h-12 w-12" />,
						value: 'Gaming',
					},
					{
						label: 'Other',
						icon: <CiCircleMore className="mx-auto h-12 w-12" />,
						value: 'Other',
					},
				]}
				onSelect={(value) => {
					setData({
						...data,
						communityTopic: value as
							| 'Education'
							| 'Software'
							| 'Gaming'
							| 'Other',
					});
					goToPage('what-type-of-community');
				}}
			/>
		</div>
	);
}

export function WhatTypeOfCommunityDoYouHave() {
	const { goToPage, setData, data } = useOnboardingContext();
	return (
		<div>
			<Heading.H1 className="py-8 text-4xl">
				What type of community do you have?
			</Heading.H1>
			<ButtonMenu
				options={[
					{
						label: 'Non Commercial',
						icon: <MdMoneyOffCsred className="mx-auto h-12 w-12" />,
						value: 'Non-Commercial',
					},
					{
						label: 'Commercial',
						icon: <MdAttachMoney className="mx-auto h-12 w-12" />,
						value: 'Commercial',
					},
				]}
				onSelect={(value) => {
					setData({
						...data,
						communityType: value as 'Non-Commercial' | 'Commercial',
					});
					goToPage('enable-indexing');
				}}
			/>
		</div>
	);
}

const SetupPage = (props: {
	icon: React.ReactNode;
	title: React.ReactNode;
	description: React.ReactNode;
	command: string;
	bulletPoints: React.ReactNode[];
	nextPage: OnboardingPage;
}) => {
	const { goToPage } = useOnboardingContext();
	return (
		<div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 p-4">
			<div className="mx-auto flex flex-row gap-4 py-4">
				{props.icon}
				<div className="grid grid-cols-1">
					<Heading.H1 className="max-w-md py-4 text-4xl">
						{props.title}
					</Heading.H1>
					<div className="mx-auto">
						<Command command={props.command} />
					</div>
				</div>
			</div>
			<span className="text-lg">{props.description}</span>
			<ul className="list-inside list-disc py-4 text-left text-lg">
				{props.bulletPoints.map((bulletPoint, i) => (
					<li key={i} className="py-2">
						{bulletPoint}
					</li>
				))}
			</ul>
			<div className="">
				<Button
					onClick={() => {
						goToPage(props.nextPage);
					}}
				>
					Continue
				</Button>
			</div>
		</div>
	);
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export function EnableIndexingPage() {
	return (
		<SetupPage
			icon={<MagnifyingGlassCircleIcon className="hidden h-32 w-32 md:block" />}
			title="Enable Indexing"
			description='Open the "Indexing Settings" menu via /channel-settings and click the "Enable Indexing" button'
			command="channel-settings"
			bulletPoints={[
				'Indexing starts from the beginning of your channel',
				'If you have a lot of posts it may take a few days for them to all be indexed',
				"If you're indexing a forum channel, run this command in a thread of the forum channel",
			]}
			nextPage="enable-read-the-rules-consent"
		/>
	);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function EnableForumGuidelinesConsent() {
	return (
		<SetupPage
			icon={<ChatBubbleLeftIcon className="hidden h-32 w-32 md:block" />}
			title="Enable Forum Guidelines Consent"
			description='Open the "Indexing Settings" menu via /channel-settings and click the "Enable Forum Guidelines Consent" button'
			command="channel-settings"
			bulletPoints={[
				'Users have to provide consent for their messages to be shown publicly.',
				'Forum guidelines consent marks users who post in the channel as consenting',
				'Users can manage their account with the /manage-account command.',
				<BlueLink
					href="https://docs.answeroverflow.com/user-settings/displaying-messages"
					target="_blank"
					key={'displaying-messages'}
				>
					Learn more about displaying messages on Answer Overflow
				</BlueLink>,
			]}
			nextPage="enable-mark-solution"
		/>
	);
}

export function EnableMarkSolution() {
	return (
		<SetupPage
			icon={<CheckCircleIcon className="hidden h-32 w-32 md:block" />}
			title="Enable Mark Solution"
			description='Open the "Help channel utilities" menu via /channel-settings and click the "Enable mark as solution" button'
			command="channel-settings"
			bulletPoints={[
				'This allows users to mark a message as the solution to a question.',
				`Anyone with the ManageThreads, ManageGuild, or Administrator permission can mark a message as the solution.`,
				'For normal users to mark a message as solved, they must be the question author',
				'You can manage who has access to this command in the integrations tab',
			]}
			nextPage="final-checklist"
		/>
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

export function FinalChecklistPage() {
	const { data } = useOnboardingContext();
	return (
		<div>
			<Heading.H1>Setup Complete!</Heading.H1>
			<Heading.H2>{"Here's"} a few extra things you can do</Heading.H2>
			<ul className="list-inside list-disc py-4 text-left text-lg">
				<li>
					Make an announcement post in your server to let people {"you've "}
					started indexing your channels
				</li>
				<li>
					Link your Answer Overflow page in your documentation / GitHub to
					improve your performance in search results
				</li>
				<li>
					Browse{' '}
					<BlueLink
						href="https://docs.answeroverflow.com"
						className={'underline'}
					>
						the documentation
					</BlueLink>{' '}
					to learn more about Answer Overflow
				</li>
			</ul>
			<div className="mx-auto py-4">
				<LinkButton href={`/dashboard/${data.server!.id}`}>
					View Dashboard
				</LinkButton>
			</div>
			<span>
				Your page may take some time to update due to caching & indexing times.
			</span>
		</div>
	);
}
