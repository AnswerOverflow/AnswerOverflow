import { Database } from "@packages/database/database";
import { ChannelThreadCardSkeleton } from "@packages/ui/components/thread-card";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { getServerCustomUrl } from "@packages/ui/utils/server";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Effect, Option } from "effect";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CommunityPageSkeleton } from "../../../../../components/channel-page-content";
import {
	ChannelPageLoader,
	fetchChannelPageHeaderData,
	generateChannelPageMetadata,
} from "../../../../../components/channel-page-loader";
import { runtime } from "../../../../../lib/runtime";

export async function generateStaticParams() {
	const servers = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.servers.getBrowseServers({});
	}).pipe(runtime.runPromise);

	const params: Array<{ serverId: string; channelId: string }> = [];

	for (const server of servers.slice(0, 5)) {
		const serverData = await Effect.gen(function* () {
			const database = yield* Database;
			return yield* database.public.servers.getServerByDiscordIdWithChannels({
				discordId: server.discordId,
			});
		}).pipe(runtime.runPromise);

		if (serverData?.channels) {
			for (const channel of serverData.channels.slice(0, 2)) {
				params.push({
					serverId: server.discordId.toString(),
					channelId: channel.id.toString(),
				});
			}
		}
	}

	return params;
}

type Props = {
	params: Promise<{ serverId: string; channelId: string }>;
	searchParams: Promise<{ cursor?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;

	const parsedServerId = parseSnowflakeId(params.serverId);
	const parsedChannelId = parseSnowflakeId(params.channelId);
	if (Option.isNone(parsedServerId) || Option.isNone(parsedChannelId)) {
		return {};
	}
	if (parsedServerId.value.wasCleaned || parsedChannelId.value.wasCleaned) {
		redirect(
			`/c/${parsedServerId.value.cleaned}/${parsedChannelId.value.cleaned}`,
		);
	}

	const headerData = await fetchChannelPageHeaderData(
		parsedServerId.value.id,
		parsedChannelId.value.id,
	);

	const basePath = `/c/${parsedServerId.value.cleaned}/${parsedChannelId.value.cleaned}`;
	return generateChannelPageMetadata(headerData, basePath);
}

function ChannelPageSkeleton() {
	return (
		<CommunityPageSkeleton
			threadsSkeleton={
				<div className="space-y-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<ChannelThreadCardSkeleton key={`skeleton-${i}`} />
					))}
				</div>
			}
		/>
	);
}

async function ChannelPageContent(props: {
	serverId: string;
	channelId: string;
	cursor?: string;
}) {
	"use cache";
	cacheLife("minutes");
	cacheTag("channel-page", props.serverId, props.channelId);

	const parsedServerId = parseSnowflakeId(props.serverId);
	const parsedChannelId = parseSnowflakeId(props.channelId);
	if (Option.isNone(parsedServerId) || Option.isNone(parsedChannelId)) {
		return notFound();
	}
	if (parsedServerId.value.wasCleaned || parsedChannelId.value.wasCleaned) {
		redirect(
			`/c/${parsedServerId.value.cleaned}/${parsedChannelId.value.cleaned}`,
		);
	}

	const headerData = await fetchChannelPageHeaderData(
		parsedServerId.value.id,
		parsedChannelId.value.id,
	);

	if (headerData?.server.customDomain) {
		const customUrl = getServerCustomUrl(
			headerData.server,
			`/c/${parsedServerId.value.cleaned}/${parsedChannelId.value.cleaned}`,
		);
		if (customUrl) {
			return redirect(customUrl);
		}
	}

	return <ChannelPageLoader headerData={headerData} cursor={props.cursor} />;
}

export default async function ChannelPage(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const encodedCursor = searchParams?.cursor;
	const cursor = encodedCursor ? decodeCursor(encodedCursor) : undefined;

	return (
		<Suspense fallback={<ChannelPageSkeleton />}>
			<ChannelPageContent
				serverId={params.serverId}
				channelId={params.channelId}
				cursor={cursor}
			/>
		</Suspense>
	);
}
