"use client";

import { convexQuery } from "@convex-dev/react-query";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import type {
	ChannelSettings,
	Message,
} from "@packages/database/convex/schema";
import { LinkMessage } from "@packages/ui/components/link-message";
import { MessagesSearchBar } from "@packages/ui/components/messages-search-bar";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { ServerInviteJoinButton } from "@packages/ui/components/server-invite";
import { getServerDescription } from "@packages/ui/lib/server-utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Suspense } from "react";
import { api } from "../../../../../../../packages/database/convex/_generated/api";
import { cn } from "@packages/ui/lib/utils";

type Server = {
	_id: Id<"servers">;
	discordId: string;
	name: string;
	icon?: string;
	description?: string;
	vanityInviteCode?: string;
};

type Channel = {
	id: string;
	name: string;
	type: number;
	serverId?: Id<"servers">;
	parentId?: string;
	inviteCode?: string;
	archivedTimestamp?: number;
	solutionTagId?: string;
	lastIndexedSnowflake?: string;
	flags?: ChannelSettings;
};

type ChannelWithName = {
	id: string;
	name: string;
	type: number;
	inviteCode?: string;
};

type ThreadWithMessage = {
	thread: Channel & { serverId: Id<"servers"> };
	message: Message;
};

export function ChannelPageClient(props: {
	server: Server;
	channels: ChannelWithName[];
	selectedChannel: Channel;
	threads: ThreadWithMessage[];
}) {
	// Fetch live updates for threads
	const { data: liveThreads } = useQuery({
		...convexQuery(api.public.channels.findAllThreadsByParentId, {
			parentId: props.selectedChannel.id,
			limit: 50,
		}),
	});

	// For now, use initial threads data since we need messages for each thread
	// TODO: Fetch messages for live threads when they update
	const threads = props.threads;

	const HeroArea = () => {
		return (
			<div className="flex flex-col">
				<div className="m-auto flex w-full flex-row rounded-sm bg-gradient-to-r from-[#7196CD] to-[#82adbe] px-4 py-8 dark:to-[#113360] sm:px-8 xl:px-[7rem] xl:py-16 2xl:py-20">
					<div className="mx-auto flex flex-row gap-4">
						<ServerIcon
							server={props.server}
							size={128}
							className="hidden sm:flex"
						/>

						<div>
							<h1 className="hidden pt-0 text-5xl font-bold text-primary md:block">
								{props.server.name}
							</h1>
							<div className="hidden md:block">
								<h2 className="text-xl font-normal text-primary">
									{getServerDescription(props.server)}
								</h2>
								<ServerInviteJoinButton
									className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0"
									server={props.server}
									location="Community Page"
									channel={props.selectedChannel}
								/>
							</div>
						</div>
						<div className="flex w-full flex-col items-center text-center md:hidden">
							<div className="flex flex-row items-center justify-center gap-2">
								<ServerIcon
									server={props.server}
									size={64}
									className="flex sm:hidden"
								/>
								<h1 className="pt-0 text-3xl font-bold text-primary">
									{props.server.name}
								</h1>
							</div>
							<h2 className="text-base font-normal text-primary">
								{getServerDescription(props.server)}
							</h2>
							<ServerInviteJoinButton
								className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0"
								server={props.server}
								location="Community Page"
								channel={props.selectedChannel}
							/>
						</div>
					</div>
				</div>
			</div>
		);
	};

	const ChannelSidebar = () => {
		return (
			<div className="hidden lg:flex w-80 shrink-0 flex-col border rounded-lg sticky top-6 self-start max-h-[calc(100vh-8rem)] bg-white dark:bg-gray-900">
				<div className="flex-1 overflow-y-auto p-4 min-h-0">
					<div className="space-y-1">
						<div className="mb-4">
							<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
								Channels
							</h3>
						</div>
						{props.channels.map((channel) => {
							const isSelected = channel.id === props.selectedChannel.id;
							return (
								<Link
									key={channel.id}
									href={`/c/${props.server.discordId}/${channel.id}`}
									className={cn(
										"flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
										isSelected
											? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-semibold"
											: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
									)}
								>
									<span className="text-gray-500 dark:text-gray-400">#</span>
									<span className="truncate">{channel.name}</span>
								</Link>
							);
						})}
					</div>
				</div>
			</div>
		);
	};

	const ThreadsSection = () => {
		if (!props.selectedChannel) {
			return (
				<h4 className="text-center text-2xl font-semibold text-primary">
					No channel selected.
				</h4>
			);
		}
		if (!threads || threads.length === 0) {
			return (
				<div className="flex flex-col items-center">
					<h4 className="text-center text-2xl font-semibold text-primary">
						No threads found for this channel.
					</h4>
				</div>
			);
		}

		return (
			<div className="flex w-full flex-1 flex-col gap-2">
				{threads.map(({ thread, message }) => (
					<LinkMessage
						key={thread.id}
						message={message}
						thread={thread}
						className="rounded-lg drop-shadow-sm"
					/>
				))}
			</div>
		);
	};

	const CommunityQuestionsSection = () => (
		<>
			<Suspense>
				<MessagesSearchBar
					placeholder={`Search the ${props.server.name} community`}
					serverId={props.server.discordId}
				/>
			</Suspense>

			<div className="flex flex-row gap-6 pt-4">
				<ChannelSidebar />
				<div className="flex-1 min-w-0">
					<ThreadsSection />
				</div>
			</div>
		</>
	);

	return (
		<div className="mx-auto w-full overflow-y-auto overflow-x-hidden bg-background">
			<main className="bg-background pt-2">
				<HeroArea />
				<div className="py-8">
					<div className="px-4 2xl:px-[6rem]">
						<CommunityQuestionsSection />
					</div>
				</div>
			</main>
		</div>
	);
}
