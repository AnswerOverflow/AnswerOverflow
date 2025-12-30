"use client";

import { Button } from "@packages/ui/components/button";
import { Link } from "@packages/ui/components/link";
import { ServerIcon } from "@packages/ui/components/server-icon";
import Image from "next/image";

type ServerCardProps = {
	server: {
		discordId: bigint;
		name: string;
		icon: string | null;
		highestRole: "Manage Guild" | "Administrator" | "Owner";
		hasBot: boolean;
		aoServerId: string | undefined;
	};
};

export function ServerCard({ server }: ServerCardProps) {
	return (
		<div className="flex max-w-md flex-col gap-3 rounded-lg bg-white dark:bg-black/40 pb-4 shadow-lg overflow-hidden">
			{/* Hero section with background */}
			<div className="relative mx-auto aspect-video w-full rounded-t-lg">
				{server.icon && (
					<Image
						src={`https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.webp`}
						alt={server.name}
						fill
						className="h-full w-full overflow-hidden rounded-t-lg object-cover opacity-25"
					/>
				)}
				<div className="relative z-10 h-full w-full rounded-t-lg bg-black/5 dark:bg-black/5 shadow-md backdrop-blur-md" />
				<div className="absolute inset-0 z-20 flex items-center justify-center">
					<ServerIcon
						server={{
							discordId: server.discordId,
							name: server.name,
							icon: server.icon ?? undefined,
						}}
						size={64}
					/>
				</div>
			</div>

			{/* Title and CTA section */}
			<div className="flex w-full flex-row items-center justify-between align-bottom px-4">
				<div className="flex flex-col pr-4 text-left">
					<span className="text-base font-bold text-black dark:text-neutral-300">
						{server.name}
					</span>
					<span className="text-base text-neutral-600 dark:text-neutral-400">
						{server.highestRole}
					</span>
				</div>
				<div className="ml-auto">
					{server.hasBot ? (
						<Button asChild>
							<Link href={`/dashboard/${server.discordId.toString()}`}>
								View
							</Link>
						</Button>
					) : (
						<Button asChild variant="outline">
							<Link
								href={`/dashboard/${server.discordId.toString()}/onboarding`}
							>
								Setup
							</Link>
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
