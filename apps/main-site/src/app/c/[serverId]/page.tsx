import { Database } from "@packages/database/database";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	ChannelPageLoader,
	fetchChannelPageHeaderData,
} from "../../../components/channel-page-loader";
import { runtime } from "../../../lib/runtime";

type Props = {
	params: Promise<{ serverId: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;

	const serverData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData =
			yield* database.private.servers.getServerByDiscordIdWithChannels({
				discordId: BigInt(params.serverId),
			});
		return liveData;
	}).pipe(runtime.runPromise);

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
			images: [`/og/community?id=${params.serverId}`],
			title: `${server.name} - AnswerOverflow`,
			description,
		},
		alternates: {
			canonical: `/c/${params.serverId}`,
		},
	};
}

export default async function ServerPage(props: Props) {
	const params = await props.params;

	const serverData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData =
			yield* database.private.servers.getServerByDiscordIdWithChannels({
				discordId: BigInt(params.serverId),
			});
		return liveData;
	}).pipe(runtime.runPromise);

	if (!serverData || serverData?.server.kickedTime) {
		return notFound();
	}

	const { server, channels } = serverData;

	if (channels.length === 0) {
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

	const defaultChannel = channels[0];
	if (!defaultChannel) {
		return notFound();
	}

	const headerData = await fetchChannelPageHeaderData(
		BigInt(params.serverId),
		defaultChannel.id,
	);

	return <ChannelPageLoader headerData={headerData} />;
}
