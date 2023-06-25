import {
	Button,
	Heading,
	ManageServerCard,
	ServerIcon,
	SignInButton,
} from '~ui/components/primitives';
import { useOnboardingContext } from './OnboardingLanding';
import { trpc } from '~ui/utils/trpc';
import type { ServerPublic } from '@answeroverflow/api';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
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
import { Command } from '~ui/components/primitives/base/Command';
import Link from 'next/link';

export const pages = [
	'start',
	'waiting-to-be-added',
	'what-type-of-community',
	'enable-indexing',
	'enable-read-the-rules-consent',
	'enable-mark-solution',
	'final-checklist',
] as const;
export type OnboardingPage = (typeof pages)[number];

export const WaitingToBeAdded = () => {
	const { data } = useOnboardingContext();
	const [lastChecked, setLastChecked] = useState(Date.now());
	const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());

	const { status } = trpc.servers.byIdPublic.useQuery(data.server!.id, {
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
};

export const WaitingToBeAddedRenderer = (props: {
	server: ServerPublic;
	timeSinceLastCheckInSeconds: number;
	hasJoined: boolean;
}) => {
	const { goToPage } = useOnboardingContext();
	if (props.hasJoined) {
		return (
			<div className="flex flex-col items-center justify-center gap-8 text-center">
				<Heading.H1>Joined {props.server.name}!</Heading.H1>
				<ServerIcon size={'xl'} server={props.server} />
				<Button
					size={'lg'}
					onClick={() => {
						goToPage('what-type-of-community');
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
			<div className="h-32 w-32 animate-spin rounded-full border-b-4 border-ao-blue" />
			<span className="text-ao-black dark:text-ao-white">
				Last checked {props.timeSinceLastCheckInSeconds} second
				{props.timeSinceLastCheckInSeconds === 1 ? '' : 's'} ago.
			</span>
		</div>
	);
};

const ButtonMenu = (props: {
  options: {
    label: React.ReactNode;
    icon: React.ReactNode;
    value: React.ReactNode;
  }
}) => {
  return ()
}

export const WhatIsYourCommunityAbout = () => {
	return (
		<div>
			<Heading.H1 className="py-8 text-4xl">
				What topic best fits your community?
			</Heading.H1>
			<div className="mx-auto grid max-w-md grid-cols-1 items-center justify-items-center gap-8 py-8 md:grid-cols-2">
				<Button className="grid h-32 w-32 grid-cols-1">
					<AcademicCapIcon className="mx-auto h-12 w-12" />
					<span>Education</span>
				</Button>
				<Button className="grid h-32 w-32 grid-cols-1">
					<CodeBracketIcon className="mx-auto h-12 w-12" />
					<span>Software</span>
				</Button>
				<Button className="grid h-32 w-32 grid-cols-1">
					<IoGameControllerOutline className="mx-auto h-12 w-12" />
					<span>Gaming</span>
				</Button>
				<Button className="grid h-32 w-32 grid-cols-1">
					<CiCircleMore className="mx-auto h-12 w-12" />
					<span>Other</span>
				</Button>
			</div>
		</div>
	);
};

export const WhatTypeOfCommunityDoYouHave = () => {
	return (
		<div>
			<Heading.H1 className="py-8 text-4xl">
				What type of community do you have?
			</Heading.H1>
			<div className="mx-auto grid max-w-md grid-cols-1 items-center justify-items-center gap-8 py-8 md:grid-cols-2">
				<Button className="grid h-32 w-32 grid-cols-1">
					<MdMoneyOffCsred className="mx-auto h-12 w-12" />
					<span>Non Commercial</span>
				</Button>
				<Button className="grid h-32 w-32 grid-cols-1">
					<MdAttachMoney className="mx-auto h-12 w-12" />
					<span>Commercial</span>
				</Button>
			</div>
		</div>
	);
};

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
		<div className="mx-auto grid max-w-xl grid-cols-1 gap-4 p-4 text-ao-black dark:text-ao-white">
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
			<span className="text-lg text-ao-black dark:text-ao-white">
				{props.description}
			</span>
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
export const EnableIndexingPage = () => (
	<SetupPage
		icon={<MagnifyingGlassCircleIcon className="hidden h-32 w-32 md:block" />}
		title="Enable Indexing"
		description='Open the "Indexing Settings" menu via /channel-settings and click the "Enable Indexing" button'
		command="channel-settings"
		bulletPoints={[
			'Indexing starts from the beginning of your channel',
			'If you have a lot of posts it may take a few days for them to all be indexed',
			"If you're indexing a fourm channel, run this command in a thread of the forum channel",
		]}
		nextPage="enable-read-the-rules-consent"
	/>
);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const EnableForumGuidelinesConsent = () => (
	<SetupPage
		icon={<ChatBubbleLeftIcon className="hidden h-32 w-32 md:block" />}
		title="Enable Forum Guidelines Consent"
		description="Users have to provide consent for their messages to be shown publicly. This provides consent for all users posting in a channel."
		command="channel-settings"
		bulletPoints={[
			'Users can manage their account with the /manage-account command.',
		]}
		nextPage="enable-mark-solution"
	/>
);

export const EnableMarkSolution = () => (
	<SetupPage
		icon={<CheckCircleIcon className="hidden h-32 w-32 md:block" />}
		title="Enable Mark Solution"
		description="This allows users to mark a message as the solution to a question."
		command="channel-settings"
		bulletPoints={[
			`Anyone with the ManageThreads, ManageGuild, or Administrator permission can mark a message as the solution.`,
			'For normal users to mark a message as solved, they must be the question author',
			'You can manage who has access to this command in the integrations tab',
		]}
		nextPage="final-checklist"
	/>
);

export const WelcomePage = () => {
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
