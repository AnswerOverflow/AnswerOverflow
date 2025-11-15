"use client";

import type { Server } from "@packages/database/convex/schema";
import { Button } from "@packages/ui/components/button";
import { ServerIcon } from "@packages/ui/components/server-icon";
import Image from "next/image";
import Link from "next/link";

const ServerCard = (props: { server: Server }) => {
	const { server } = props;
	return (
		<div className="flex max-w-md flex-col gap-3 rounded-lg">
			<div className="relative mx-auto aspect-video w-full rounded-lg">
				{server.icon && (
					<Image
						src={`https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.webp`}
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
			<div className="flex w-full flex-col gap-4">
				<div className="flex w-full flex-row items-center justify-between gap-2">
					<span className="text-base font-bold text-black dark:text-neutral-300">
						{server.name}
					</span>
					<Button asChild>
						<Link href={`/c/${server.discordId}`}>View</Link>
					</Button>
				</div>
				<span className="text-sm text-neutral-600 dark:text-neutral-400">
					{server.description ??
						`Join the ${server.name} server to ask questions!`}
				</span>
			</div>
		</div>
	);
};

export function ServerGrid(props: { servers: Server[] }) {
	return (
		<div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{props.servers.map((server) => {
				return (
					<div
						key={`server-${server.discordId}-area`}
						className="w-full max-w-md rounded-md p-4 transition-all"
					>
						<ServerCard server={server} />
					</div>
				);
			})}
		</div>
	);
}
