import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer } from "effect";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Hash, MessageSquare } from "lucide-react";

const OtelLayer = createOtelLayer("main-site");

type Props = {
	params: Promise<{ serverId: string }>;
};

function getChannelIcon(type: number) {
	if (type === 15) return MessageSquare; // Forum
	return Hash; // Text, Announcement, etc.
}

export default async function ServerPage(props: Props) {
	const params = await props.params;

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* Effect.scoped(
			database.servers.getServerByDiscordIdWithChannels({
				discordId: params.serverId,
			}),
		);
		return liveData;
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	if (!pageData) {
		return notFound();
	}

	const { server, channels } = pageData;

	// Filter to root channels only (not threads) and sort
	const rootChannels = channels
		.filter((channel) => {
			// Filter out thread types (11, 12)
			return channel.type !== 11 && channel.type !== 12;
		})
		.sort((a, b) => {
			// Sort: forums first, then announcements, then text
			if (a.type === 15) return -1; // GuildForum
			if (b.type === 15) return 1;
			if (a.type === 5) return -1; // GuildAnnouncement
			if (b.type === 5) return 1;
			return 0;
		});

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				{/* Header */}
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

				{/* Channels Grid */}
				<div>
					<h2 className="text-xl font-semibold text-foreground mb-4">
						Channels
					</h2>
					{rootChannels.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground">
							No channels available
						</div>
					) : (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{rootChannels.map((channel) => {
								const Icon = getChannelIcon(channel.type);
								return (
									<Link
										key={channel.id}
										href={`/c/${server.discordId}/${channel.id}`}
										className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-sidebar-border hover:bg-accent"
									>
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
											<Icon className="h-5 w-5" />
										</div>
										<div className="min-w-0 flex-1">
											<h3 className="font-semibold text-card-foreground group-hover:text-accent-foreground">
												{channel.name}
											</h3>
											<p className="text-sm text-muted-foreground group-hover:text-accent-foreground/70">
												Browse threads →
											</p>
										</div>
									</Link>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
