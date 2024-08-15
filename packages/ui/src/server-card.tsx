import { type ServerPublic } from '@answeroverflow/api';
import { LinkButton } from './ui/link-button';
import { ServerIcon } from './server-icon';
import Image from 'next/image';
import { getServerDescription, getServerHomepageUrl } from './utils/server';

export type ServerCardProps = {
	server: ServerPublic;
	className?: string;
	hero?: React.ReactNode;
	title?: React.ReactNode;
	cta?: React.ReactNode;
	about?: React.ReactNode;
};

const ServerCTA = ({ server }: Pick<ServerCardProps, 'server'>) => {
	return (
		<LinkButton
			href={getServerHomepageUrl(server)}
			target={'Blank'}
			referrerPolicy="no-referrer"
		>
			Manage
		</LinkButton>
	);
};

const ServerHero = ({ server }: Pick<ServerCardProps, 'server'>) => {
	return (
		<div className="relative mx-auto aspect-video w-full rounded-lg">
			{server.icon && (
				<Image
					src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.webp`}
					alt={server.name}
					fill
					className="h-full w-full overflow-hidden rounded-lg object-cover opacity-25"
				/>
			)}
			<div className="relative z-10 h-full w-full rounded-lg bg-black/5 shadow-md backdrop-blur-md" />
			<div className="absolute inset-0 z-20 flex items-center justify-center">
				{server && <ServerIcon server={server} size={64} />}
			</div>
		</div>
	);
};

const ServerTitle = ({ server }: Pick<ServerCardProps, 'server'>) => {
	return (
		<span className="text-base font-bold text-black dark:text-neutral-300">
			{server.name}
		</span>
	);
};

export const ServerCard = (props: ServerCardProps) => {
	return (
		<div className="flex max-w-md flex-col gap-3 rounded-lg">
			{props.hero ?? <ServerHero server={props.server} />}
			<div className="flex w-full flex-row items-center justify-between align-bottom">
				{props.about ?? (
					<>
						<div className="flex flex-col">
							{props.title ?? <ServerTitle server={props.server} />}
						</div>
						<div className="ml-auto">
							{props.cta ?? <ServerCTA server={props.server} />}
						</div>
					</>
				)}
			</div>
		</div>
	);
};

const ViewServerAbout = ({ server }: Pick<ServerCardProps, 'server'>) => {
	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex w-full flex-row items-center justify-between gap-2">
				<ServerTitle server={server} />
				<LinkButton
					className="ml-4"
					href={getServerHomepageUrl(server)}
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
	return (
		<ServerCard {...props} about={<ViewServerAbout server={props.server} />} />
	);
};

export const ManageServerCard = (props: {
	server: ServerPublic & {
		highestRole: 'Owner' | 'Administrator' | 'Manage Guild';
		hasBot: boolean;
	};
	onSetupClick?: (
		server: ServerPublic & {
			highestRole: 'Owner' | 'Administrator' | 'Manage Guild';
			hasBot: boolean;
		},
	) => void;
}) => {
	const Title = () => (
		<div className="flex flex-col pr-4 text-left">
			<ServerTitle server={props.server} />
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
					<LinkButton href={`/dashboard/${props.server.id}`}>View</LinkButton>
				) : (
					<LinkButton
						href={`https://discord.com/oauth2/authorize?client_id=958907348389339146&permissions=328565083201&scope=bot+applications.commands&guild_id=${props.server.id}&disable_guild_select=true`}
						target={'Blank'}
						referrerPolicy="no-referrer"
						variant={'outline'}
						onMouseDown={() => props.onSetupClick?.(props.server)}
					>
						Setup
					</LinkButton>
				)
			}
		/>
	);
};
