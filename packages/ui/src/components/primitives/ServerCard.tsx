import type { ServerPublic } from '@answeroverflow/api';
import Link from 'next/link';
import { Button, LinkButton, LockIcon } from './base';
import { ServerIcon } from './ServerIcon';
import Image from 'next/image';

export type ManageServerCardProps =
	| {
			server: ServerPublic;
			role: string;
			type: 'manage';
	  }
	| {
			server: ServerPublic;
			type: 'join';
	  };

export function ServerCard(props: ManageServerCardProps) {
	const ServerTitle = () => {
		if (props.type !== 'manage')
			return (
				<span className="text-base font-bold text-black dark:text-neutral-300">
					{props.server.name}
				</span>
			);

		return (
			<div className="flex flex-col gap-1">
				<span className="text-base font-bold text-black dark:text-neutral-300">
					{props.server.name}
				</span>
				<span className="text-sm text-gray-600 dark:text-neutral-400">
					{props.role}
				</span>
			</div>
		);
	};

	const ServerIconWithBlurredBackground = () => {
		return (
			<div className="relative mx-auto aspect-video rounded-lg">
				{props.server.icon && (
					<Image
						src={`https://cdn.discordapp.com/icons/${props.server.id}/${props.server.icon}.png`}
						alt={props.server.name}
						fill
						className="h-full w-full overflow-hidden rounded-lg object-cover opacity-25"
					/>
				)}
				<div className="relative z-10 h-full w-full rounded-lg bg-black/5 shadow-md backdrop-blur-md " />
				<div className="absolute inset-0 z-20 flex items-center justify-center">
					<ServerIcon server={props.server} size={'lg'} />
				</div>
			</div>
		);
	};

	const ServerCTA = () => {
		if (props.type === 'join') {
			if (!props.server.vanityUrl)
				return (
					<Button variant="default" disabled>
						<LockIcon className="mr-2 h-4 w-4" />
						Join
					</Button>
				);

			return (
				<LinkButton href={`https://discord.gg/${props.server.vanityUrl}`}>
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

	return (
		<div className="grid max-w-xs grid-cols-2 grid-rows-2 gap-3 rounded-lg">
			<div className="col-span-2 col-start-1 row-span-2 row-start-1">
				<ServerIconWithBlurredBackground />
			</div>
			<div className="col-span-2 flex flex-row items-center justify-between">
				<ServerTitle />
				<div className="ml-auto">
					<ServerCTA />
				</div>
			</div>
		</div>
	);
}
