import { type ServerPublic } from '@answeroverflow/api';
import Link from 'next/link';
import { Button, LinkButton } from './base';
import { ServerIcon } from './ServerIcon';
import Image from 'next/image';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { createContext, useContext } from 'react';

type ServerCardProps = {
	server?: ServerPublic | undefined;
	hero?: React.ReactNode;
	title?: React.ReactNode;
	cta?: React.ReactNode;
	className?: string;
	type: 'join' | 'manage';
};

// eslint-disable-next-line @typescript-eslint/naming-convention
const ServerCardContext = createContext<{
	server: ServerPublic | undefined;
	type: 'join' | 'manage';
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
	const { server, type } = useServerCardContext();

	if (type === 'join') {
		if (!server?.vanityUrl)
			return (
				<Button variant="default" disabled>
					<LockClosedIcon className="mr-2 h-4 w-4" />
					Private
				</Button>
			);

		return (
			<LinkButton href={`https://discord.gg/${server.vanityUrl}`}>
				<Button variant="default">Join</Button>
			</LinkButton>
		);
	}

	return (
		<Link
			href={`https://discord.gg/`}
			target={'Blank'}
			referrerPolicy="no-referrer"
		>
			<Button variant="default">Manage</Button>
		</Link>
	);
};

const ServerHero = () => {
	const { server } = useServerCardContext();

	return (
		<div className="col-span-2 col-start-1 row-span-2 row-start-1">
			<div className="relative mx-auto aspect-video rounded-lg">
				{server?.icon && (
					<Image
						src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`}
						alt={server?.name}
						fill
						className="h-full w-full overflow-hidden rounded-lg object-cover opacity-25"
					/>
				)}
				<div className="relative z-10 h-full w-full rounded-lg bg-black/5 shadow-md backdrop-blur-md " />
				<div className="absolute inset-0 z-20 flex items-center justify-center">
					{server && <ServerIcon server={server} size={'lg'} />}
				</div>
			</div>
		</div>
	);
};

const ServerTitle = () => {
	const { server } = useServerCardContext();

	return (
		<span className="text-base font-bold text-black dark:text-neutral-300">
			{server?.name}
		</span>
	);
};

export const ServerCard = ({
	server,
	hero = <ServerHero />,
	title = <ServerTitle />,
	cta = <ServerCTA />,
	type,
}: ServerCardProps) => {
	return (
		<ServerCardContext.Provider value={{ server, type }}>
			<div className="grid max-w-xs grid-cols-2 grid-rows-2 gap-3 rounded-lg">
				{hero}

				<div className="col-span-2 flex flex-row items-center justify-between">
					{title}
					<div className="ml-auto">{cta}</div>
				</div>
			</div>
		</ServerCardContext.Provider>
	);
};
