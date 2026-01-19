"use client";

import Image from "next/image";
import {
	getDiscordServerBannerUrl,
	getDiscordServerIconUrl,
} from "../utils/discord";
import { Link } from "./link";
import { ServerIcon } from "./server-icon";
import { Skeleton } from "./skeleton";

export type ServerCardServer = {
	discordId: bigint;
	name: string;
	icon?: string | null;
	banner?: string | null;
	description?: string | null;
	approximateMemberCount: number;
};

function formatMemberCount(count: number): string {
	if (count >= 1000000) {
		return `${(count / 1000000).toFixed(1)}M`;
	}
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1)}K`;
	}
	return count.toLocaleString();
}

export type ServerCardProps = {
	server: ServerCardServer;
};

export function ServerCard({ server }: ServerCardProps) {
	const hasBanner = Boolean(server.banner);

	return (
		<Link
			href={`/c/${server.discordId}`}
			className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200/50 bg-white transition-all hover:border-neutral-300 hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
		>
			<div className="relative h-24 w-full overflow-hidden">
				{hasBanner && server.banner ? (
					<Image
						src={getDiscordServerBannerUrl(server.discordId, server.banner)}
						alt=""
						fill
						className="object-cover transition-transform group-hover:scale-105"
					/>
				) : server.icon ? (
					<Image
						src={getDiscordServerIconUrl(server.discordId, server.icon)}
						alt=""
						fill
						className="object-cover scale-[3] blur-2xl saturate-150"
					/>
				) : (
					<div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600" />
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
			</div>
			<div className="-mt-6 relative flex flex-1 flex-col p-4">
				<div className="flex items-start gap-3">
					<div className="shrink-0">
						<ServerIcon
							server={{
								discordId: server.discordId,
								name: server.name,
								icon: server.icon ?? undefined,
							}}
							size={48}
						/>
					</div>
					<div className="min-w-0 flex-1 pt-2">
						<h3 className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
							{server.name}
						</h3>
						<span className="text-sm text-neutral-500">
							{formatMemberCount(server.approximateMemberCount)} members
						</span>
					</div>
				</div>
				{server.description && (
					<p className="mt-3 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
						{server.description}
					</p>
				)}
			</div>
		</Link>
	);
}

export function ServerCardSkeleton() {
	return (
		<div className="flex flex-col overflow-hidden rounded-xl border border-neutral-200/50 bg-white dark:border-neutral-800 dark:bg-neutral-900">
			<Skeleton className="h-24 w-full rounded-none" />
			<div className="-mt-6 relative flex flex-1 flex-col p-4">
				<div className="flex items-start gap-3">
					<Skeleton className="size-12 rounded-full shrink-0" />
					<div className="min-w-0 flex-1 pt-2 space-y-2">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-24" />
					</div>
				</div>
				<Skeleton className="mt-3 h-4 w-full" />
			</div>
		</div>
	);
}
