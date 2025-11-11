"use client";

import { convexQuery } from "@convex-dev/react-query";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "../../../../../../packages/database/convex/_generated/api";

type ServerWithChannels = {
	_id: Id<"servers">;
	discordId: string;
	name: string;
	icon?: string;
	description?: string;
	approximateMemberCount?: number;
	channels: Array<{
		id: string;
		name: string;
		type: number;
	}>;
};

export function ServerPageClient(props: { serverData: ServerWithChannels }) {
	const { data: liveData } = useQuery({
		...convexQuery(api.public.servers.publicFindServerByIdWithChannels, {
			id: props.serverData._id,
		}),
	});

	const data = liveData ?? props.serverData;

	if (!data) {
		return (
			<div className="max-w-4xl mx-auto p-8">
				<div className="text-center text-gray-600 dark:text-gray-400">
					Server not found
				</div>
			</div>
		);
	}

	const getChannelTypeLabel = (type: number): string => {
		if (type === 15) return "Forum";
		if (type === 5) return "Announcement";
		if (type === 0) return "Text";
		return "Channel";
	};

	return (
		<div className="max-w-4xl mx-auto p-8">
			{/* Server Header */}
			<div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
				<div className="flex items-center gap-4 mb-4">
					{data.icon ? (
						<img
							src={`https://cdn.discordapp.com/icons/${data.discordId}/${data.icon}.webp?size=128`}
							alt={data.name}
							className="w-20 h-20 rounded-full"
						/>
					) : (
						<div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
							<ServerIcon server={data} size={64} />
						</div>
					)}
					<div className="flex-1">
						<h1 className="text-3xl font-bold mb-2">{data.name}</h1>
						{data.description && (
							<p className="text-gray-600 dark:text-gray-400 mb-2">
								{data.description}
							</p>
						)}
						{data.approximateMemberCount && (
							<p className="text-sm text-gray-500 dark:text-gray-500">
								{data.approximateMemberCount.toLocaleString()} members
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Channels */}
			<div>
				<h2 className="text-xl font-semibold mb-4">Channels</h2>
				{data.channels.length === 0 ? (
					<div className="text-gray-500 dark:text-gray-400">
						No channels available
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{data.channels.map((channel) => (
							<Link
								key={channel.id}
								href={`/c/${data.discordId}/${channel.id}`}
								className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
							>
								<div className="flex items-center justify-between mb-2">
									<h3 className="font-semibold text-gray-900 dark:text-gray-100">
										#{channel.name}
									</h3>
									<span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
										{getChannelTypeLabel(channel.type)}
									</span>
								</div>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									View messages →
								</p>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
