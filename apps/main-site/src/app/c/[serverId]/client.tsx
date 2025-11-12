"use client";

import { convexQuery } from "@convex-dev/react-query";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import { MessagesSearchBar } from "@packages/ui/components/messages-search-bar";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { ServerInviteJoinButton } from "@packages/ui/components/server-invite";
import { getServerDescription } from "@packages/ui/lib/server-utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Suspense } from "react";
import { api } from "../../../../../../packages/database/convex/_generated/api";

type ServerWithChannels = {
	_id: Id<"servers">;
	discordId: string;
	name: string;
	icon?: string;
	description?: string;
	approximateMemberCount?: number;
	vanityInviteCode?: string;
	channels: Array<{
		id: string;
		name: string;
		type: number;
		inviteCode?: string;
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
			<div className="mx-auto w-full overflow-y-auto overflow-x-hidden bg-background">
				<main className="bg-background pt-2">
					<div className="px-4 py-8">
						<div className="text-center text-gray-600 dark:text-gray-400">
							Server not found
						</div>
					</div>
				</main>
			</div>
		);
	}

	const HeroArea = () => {
		return (
			<div className="flex flex-col">
				<div className="m-auto flex w-full flex-row rounded-sm bg-gradient-to-r from-[#7196CD] to-[#82adbe] px-4 py-8 dark:to-[#113360] sm:px-8 xl:px-[7rem] xl:py-16 2xl:py-20">
					<div className="mx-auto flex flex-row gap-4">
						<ServerIcon server={data} size={128} className="hidden sm:flex" />

						<div>
							<h1 className="hidden pt-0 text-5xl font-bold text-primary md:block">
								{data.name}
							</h1>
							<div className="hidden md:block">
								<h2 className="text-xl font-normal text-primary">
									{getServerDescription(data)}
								</h2>
								<ServerInviteJoinButton
									className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0"
									server={data}
									location="Community Page"
								/>
							</div>
						</div>
						<div className="flex w-full flex-col items-center text-center md:hidden">
							<div className="flex flex-row items-center justify-center gap-2">
								<ServerIcon
									server={data}
									size={64}
									className="flex sm:hidden"
								/>
								<h1 className="pt-0 text-3xl font-bold text-primary">
									{data.name}
								</h1>
							</div>
							<h2 className="text-base font-normal text-primary">
								{getServerDescription(data)}
							</h2>
							<ServerInviteJoinButton
								className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0"
								server={data}
								location="Community Page"
							/>
						</div>
					</div>
				</div>
			</div>
		);
	};

	const getChannelTypeLabel = (type: number): string => {
		if (type === 15) return "Forum";
		if (type === 5) return "Announcement";
		if (type === 0) return "Text";
		return "Channel";
	};

	return (
		<div className="mx-auto w-full overflow-y-auto overflow-x-hidden bg-background">
			<main className="bg-background pt-2">
				<HeroArea />
				<div className="py-8">
					<div className="px-4 2xl:px-[6rem]">
						<Suspense>
							<MessagesSearchBar
								placeholder={`Search the ${data.name} community`}
								serverId={data.discordId}
							/>
						</Suspense>

						{/* Channels */}
						<div className="pt-4">
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
				</div>
			</main>
		</div>
	);
}
