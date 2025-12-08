import { Database } from "@packages/database/database";
import type { api } from "@packages/database/convex/_generated/api";
import { Effect } from "effect";
import type { FunctionReturnType } from "convex/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { runtime } from "../lib/runtime";
import { ChannelPageContent } from "./channel-page-content";

export type ChannelPageData = NonNullable<
	FunctionReturnType<typeof api.private.channels.getChannelPageData>
>;

export type ServerWithChannels = NonNullable<
	FunctionReturnType<
		typeof api.private.servers.getServerByDiscordIdWithChannels
	>
>;

export async function fetchServerWithChannels(
	serverDiscordId: bigint,
): Promise<ServerWithChannels | null> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.servers.getServerByDiscordIdWithChannels({
			discordId: serverDiscordId,
		});
	}).pipe(runtime.runPromise);
}

export async function fetchChannelPageData(
	serverDiscordId: bigint,
	channelDiscordId: bigint,
): Promise<ChannelPageData | null> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.channels.getChannelPageData({
			serverDiscordId,
			channelDiscordId,
		});
	}).pipe(runtime.runPromise);
}

export function generateChannelPageMetadata(
	pageData: ChannelPageData | null,
	serverId: string,
	channelId?: string,
): Metadata {
	if (!pageData) {
		return {};
	}

	const { server, selectedChannel, channels } = pageData;
	const channelName = selectedChannel?.name ?? "Channel";
	const description =
		server.description ??
		`Browse ${channels.length} indexed channels from the ${server.name} Discord community`;

	return {
		title: `${channelName} - ${server.name} - AnswerOverflow`,
		description,
		openGraph: {
			images: [`/og/community?id=${serverId}`],
			title: `${channelName} - ${server.name} - AnswerOverflow`,
			description,
		},
		alternates: {
			canonical: channelId ? `/c/${serverId}/${channelId}` : `/c/${serverId}`,
		},
	};
}

export function generateServerPageMetadata(
	serverData: ServerWithChannels | null,
	serverId: string,
): Metadata {
	if (!serverData) {
		return {};
	}

	const { server, channels } = serverData;
	const description =
		server.description ??
		`Browse ${channels.length} indexed channels from the ${server.name} Discord community`;

	return {
		title: `${server.name} - AnswerOverflow`,
		description,
		openGraph: {
			images: [`/og/community?id=${serverId}`],
			title: `${server.name} - AnswerOverflow`,
			description,
		},
		alternates: {
			canonical: `/c/${serverId}`,
		},
	};
}

export function ChannelPageLoader(props: { pageData: ChannelPageData | null }) {
	const { pageData } = props;

	if (!pageData) {
		return notFound();
	}

	return (
		<ChannelPageContent
			server={pageData.server}
			channels={pageData.channels}
			selectedChannel={pageData.selectedChannel}
			threads={pageData.threads}
		/>
	);
}

export function EmptyServerPage(props: { serverData: ServerWithChannels }) {
	const { serverData } = props;
	const { server } = serverData;

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8 pb-6 border-b border-border">
					<div className="flex items-center gap-4">
						{server.icon && (
							<img
								src={`https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.webp?size=64`}
								alt={server.name}
								className="w-16 h-16 rounded-full"
							/>
						)}
						<div>
							<h1 className="text-3xl font-bold text-foreground">
								{server.name}
							</h1>
							{server.description && (
								<p className="text-muted-foreground mt-1">
									{server.description}
								</p>
							)}
						</div>
					</div>
				</div>
				<div className="text-center py-12 text-muted-foreground">
					No channels available
				</div>
			</div>
		</div>
	);
}
