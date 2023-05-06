import { type ServerPublic } from '@answeroverflow/api';
import { LinkButton } from './base';
import { ServerIcon } from './ServerIcon';
import Image from 'next/image';
import { createContext, useContext } from 'react';

export type ServerCardProps = {
	server: ServerPublic;
	hero?: React.ReactNode;
	description?: React.ReactNode;
	cta?: React.ReactNode;
	className?: string;
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
		<div className="col-span-2 col-start-1 row-span-2 row-start-1">
			<div className="relative mx-auto aspect-video rounded-lg">
				{server.icon && (
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

export const ServerCard = (props: ServerCardProps) => {
	const hero = props.hero ?? <ServerHero />;
	const title = props.description ?? <ServerTitle />;
	const cta = props.cta ?? <ServerCTA />;
	return (
		<ServerCardContext.Provider value={{ server: props.server }}>
			<div className="grid max-w-xs grid-cols-2 grid-rows-2 gap-3 rounded-lg">
				{hero}

				<div className="col-span-2 flex flex-row items-center justify-between">
					<div className="flex flex-col">{title}</div>
					<div className="ml-auto">{cta}</div>
				</div>
			</div>
		</ServerCardContext.Provider>
	);
};
