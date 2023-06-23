import { type ServerPublic } from '@answeroverflow/api';
import { LinkButton } from './base';
import { ServerIcon } from './ServerIcon';
import Image from 'next/image';
import { createContext, useContext } from 'react';
import { getServerDescription } from '~ui/utils/other';

export type ServerCardProps = {
	server: ServerPublic;
	className?: string;
	hero?: React.ReactNode;
	title?: React.ReactNode;
	cta?: React.ReactNode;
	about?: React.ReactNode;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
const ServerCardContext = createContext<{
	server: ServerPublic;
} | null>(null);

export function useServerCardContext() {
	const context = useContext(ServerCardContext);
	if (!context) {
		throw new Error(
			'This component must be rendered as a child of Server Card component',
		);
	}
	return context;
}

const ServerCTA = () => {
	const { server } = useServerCardContext();
	return (
		<LinkButton
			href={`/c/${server.id}`}
			target={'Blank'}
			referrerPolicy="no-referrer"
		>
			Manage
		</LinkButton>
	);
};

const ServerHero = () => {
	const { server } = useServerCardContext();

	return (
		<div className="relative mx-auto aspect-video w-full rounded-lg">
			{server.icon && (
				<Image
					src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`}
					alt={server.name}
					fill
					className="h-full w-full overflow-hidden rounded-lg object-cover opacity-25"
				/>
			)}
			<div className="relative z-10 h-full w-full rounded-lg bg-black/5 shadow-md backdrop-blur-md " />
			<div className="absolute inset-0 z-20 flex items-center justify-center">
				{server && <ServerIcon server={server} size={'lg'} />}
			</div>
		</div>
	);
};

const ServerTitle = () => {
	const { server } = useServerCardContext();

	return (
		<span className="text-base font-bold text-black dark:text-neutral-300">
			{server.name}
		</span>
	);
};

export const ServerCard = (props: ServerCardProps) => {
	return (
		<ServerCardContext.Provider value={{ server: props.server }}>
			<div className="flex max-w-md flex-col gap-3 rounded-lg">
				{props.hero ?? <ServerHero />}
				<div className="flex w-full flex-row items-center justify-between align-bottom">
					{props.about ?? (
						<>
							<div className="flex flex-col">
								{props.title ?? <ServerTitle />}
							</div>
							<div className="ml-auto">{props.cta ?? <ServerCTA />}</div>
						</>
					)}
				</div>
			</div>
		</ServerCardContext.Provider>
	);
};

const ViewServerAbout = () => {
	const { server } = useServerCardContext();

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex w-full flex-row items-center justify-between gap-2">
				<ServerTitle />
				<LinkButton
					className="ml-4"
					href={`/c/${server.id}`}
					variant={'default'}
				>
					View
				</LinkButton>
			</div>
			<span className="text-sm text-neutral-600 dark:text-neutral-400">
				{getServerDescription(server)}
			</span>
		</div>
	);
};

export const ViewServerCard = (props: ServerCardProps) => {
	return <ServerCard {...props} about={<ViewServerAbout />} />;
};

export const ManageServerCard = (props: {
	server: ServerPublic & {
		highestRole: 'Owner' | 'Administrator' | 'Manage Guild';
		hasBot: boolean;
	};
}) => {
	const Title = () => (
		<div className="flex flex-col pr-4 text-left">
			<ServerTitle />
			<span className="text-base text-neutral-600 dark:text-neutral-400">
				{props.server.highestRole}
			</span>
		</div>
	);
	return (
		<ServerCard
			server={{
				...props.server,
			}}
			title={<Title />}
			cta={
				props.server.hasBot ? (
					<LinkButton href={`/c/${props.server.id}`}>View</LinkButton>
				) : (
					<LinkButton
						href={`https://discord.com/oauth2/authorize?client_id=`}
						target={'Blank'}
						referrerPolicy="no-referrer"
						variant={'outline'}
					>
						Setup
					</LinkButton>
				)
			}
		/>
	);
};
