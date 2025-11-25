import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { ChannelPageContent } from "../../../components/channel-page-content";
import { runtime } from "../../../lib/runtime";

type Props = {
	params: Promise<{ serverId: string }>;
};

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

	if (!serverData) {
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

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* database.private.channels.getChannelPageData({
			serverDiscordId: BigInt(params.serverId),
			channelDiscordId: defaultChannel.id,
		});
		return liveData;
	}).pipe(runtime.runPromise);

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
