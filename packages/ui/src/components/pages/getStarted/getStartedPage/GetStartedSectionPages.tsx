/* eslint-disable tailwindcss/no-custom-classname */
import './GetStartedPageAnimations.css';
import { Button, Heading, Paragraph } from '~ui/components/primitives';
import type { GetStartedPageProps } from './GetStartedSection';
import type { FC } from 'react';

export const IntroPage: React.FC<GetStartedPageProps> = ({
	setPage,
	setProgress,
}) => {
	return (
		<div className="flex flex-col gap-8">
			<Heading.H1 className="pb-8 text-center text-4xl">
				What are you looking for?
			</Heading.H1>
			<div className="grid grid-rows-2 gap-8 lg:grid-cols-2 lg:gap-16">
				<Button variant={'outline'}>I{"'"}m just looking around</Button>
				<Button
					onClick={() => {
						setPage('pickPlanPage');
						setProgress(20);
					}}
				>
					I{"'"}m ready to add to my server
				</Button>
			</div>
		</div>
	);
};

const PickPlanPage: React.FC<GetStartedPageProps> = ({
	setPage,
	setProgress,
}) => {
	return (
		<div className="page-slide-in">
			<Heading.H1 className="pb-16 text-center text-4xl">
				Pick a plan
			</Heading.H1>
			<div className="grid grid-cols-2 gap-16">
				<div className="flex flex-col gap-8 rounded-standard border-1 border-white/25 bg-ao-white/1 p-5">
					<Heading.H2 className="text-center text-2xl">Free</Heading.H2>
					<Paragraph className="text-center text-lg">
						Get started with Answer Overflow for free. Lorem ipsum dolor sit
						amet consectetur adipisicing elit. Illo harum voluptatum facilis
						quisquam quam tempora beatae, autem nulla, aliquid assumenda tenetur
						totam architecto veniam. Non provident soluta cum reprehenderit
						atque!
					</Paragraph>
					<Button
						variant="outline"
						className="mt-auto"
						onClick={() => {
							setPage('addToServerPage');
							setProgress(60);
						}}
					>
						Get started for free
					</Button>
				</div>

				<div className="flex flex-col gap-8 rounded-standard border-1 border-ao-blue/25 bg-ao-blue/10 p-5 shadow-xl shadow-ao-blue/10">
					<Heading.H2 className="text-center text-2xl">Pro</Heading.H2>
					<Paragraph className="text-center text-lg">
						Get started with Answer Overflow for xyz a month. Lorem ipsum dolor
						sit amet consectetur adipisicing elit. Illo harum voluptatum facilis
						quisquam quam tempora beatae, autem nulla, aliquid assumenda tenetur
						totam architecto veniam. Non provident soluta cum reprehenderit
						atque!
					</Paragraph>
					<Button variant="destructive" className="mt-auto">
						Get started with Pro
					</Button>
				</div>
			</div>
		</div>
	);
};

const AddToServerPage: React.FC<GetStartedPageProps> = ({
	setPage,
	setProgress,
}) => {
	return (
		<div className="page-slide-in">
			<Heading.H1 className="pb-16 text-center text-4xl">
				Great! Let{"'"}s add Answer Overflow to your server!
			</Heading.H1>
			<div className="flex w-full items-center justify-center">
				{/* TODO: We should use discord blurple and a discord icon */}
				<Button
					variant="destructive"
					onClick={() => {
						setPage('addBotToServerOauth');
						setProgress(80);
					}}
				>
					Add to server
				</Button>
			</div>
		</div>
	);
};

const AddToServerOauthPage: React.FC<GetStartedPageProps> = ({ setPage }) => {
	return (
		<div className="page-slide-in flex flex-col items-center justify-center">
			<Heading.H1 className="pb-16 text-center text-4xl">
				Adding via oauth
			</Heading.H1>
			<Button
				variant="destructive"
				onClick={() => setPage('channelSettingsPage')}
			>
				Continue
			</Button>
		</div>
	);
};

const configPages: {
	readonly [key: string]: FC<GetStartedPageProps>;
} = {
	ChannelSettings: ({ setPage, setProgress }) => {
		return (
			<div className="page-slide-in">
				<Heading.H1 className="pb-16 text-center text-4xl">
					Let{"'"}s set up your channel settings!
				</Heading.H1>

				{/* Checkbox showing  */}

				<Heading.H2>Enable indexing on your favorite channels</Heading.H2>
				<Button
					variant="destructive"
					onClick={() => {
						setPage('serverSettingsPage');
						setProgress(90);
					}}
				>
					Continue
				</Button>
			</div>
		);
	},
	ServerSettings: ({ setPage, setProgress }) => {
		return (
			<div className="page-slide-in">
				<Heading.H1 className="pb-16 text-center text-4xl">
					Okay, now let{"'"}s set up your server settings!
				</Heading.H1>

				{/* Checkbox showing  */}

				<Heading.H2 className="text-lg">Run ```/channel-settings```</Heading.H2>
				<Button
					variant="destructive"
					onClick={() => {
						setPage('completePage');
						setProgress(100);
					}}
				>
					Continue
				</Button>
			</div>
		);
	},
};

const CompletePage: React.FC<GetStartedPageProps> = ({ setPage }) => {
	return (
		<div className="page-slide-in flex flex-col items-center justify-center">
			<Heading.H1 className="pb-16 text-center text-4xl">All done!</Heading.H1>
			<Button
				variant="destructive"
				onClick={() => setPage('channelSettingsPage')}
			>
				Head to docs
			</Button>
		</div>
	);
};

export const getStartedPages = [
	{
		pageIndex: 'introPage',
		component: IntroPage,
	},
	{
		pageIndex: 'pickPlanPage',
		component: PickPlanPage,
	},
	{
		pageIndex: 'addToServerPage',
		component: AddToServerPage,
	},
	{
		pageIndex: 'addBotToServerOauth',
		component: AddToServerOauthPage,
	},
	{
		pageIndex: 'channelSettingsPage',
		component: configPages.ChannelSettings,
	},
	{
		pageIndex: 'serverSettingsPage',
		component: configPages.ServerSettings,
	},
	{
		pageIndex: 'completePage',
		component: CompletePage,
	},
] as const;

export type AllPageIndex = (typeof getStartedPages)[number]['pageIndex'];
