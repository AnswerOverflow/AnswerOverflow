import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer } from "effect";
import { Hash, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const OtelLayer = createOtelLayer("main-site");

type Props = {
	params: Promise<{ serverId: string; channelId: string }>;
};

function getChannelIcon(type: number) {
	if (type === 15) return MessageSquare; // Forum
	return Hash; // Text, Announcement, etc.
}

function getSnowflakeDate(snowflake: string): Date {
	const timestamp = BigInt(snowflake) >> 22n;
	return new Date(Number(timestamp) + 1420070400000);
}

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSecs < 60) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}

export default async function ChannelPage(props: Props) {
	const params = await props.params;

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* Effect.scoped(
			database.channels.getChannelPageData({
				serverDiscordId: params.serverId,
				channelDiscordId: params.channelId,
			}),
		);
		return liveData;
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	if (!pageData) {
		return notFound();
	}

	const { server, channels, selectedChannel, threads } = pageData;

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				{/* Header */}
				<div className="mb-8 pb-6 border-b border-border">
					<div className="flex items-center gap-4 mb-2">
						<Link
							href={`/c/${server.discordId}`}
							className="text-muted-foreground hover:text-foreground transition-colors"
						>
							← Back to {server.name}
						</Link>
					</div>
					<div className="flex items-center gap-4">
						{server.icon && (
							<img
								src={`https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.webp?size=64`}
								alt={server.name}
								className="w-16 h-16 rounded-full"
							/>
						)}
						<div>
							<div className="flex items-center gap-2">
								{selectedChannel &&
									(() => {
										const Icon = getChannelIcon(selectedChannel.type);
										return <Icon className="h-5 w-5 text-muted-foreground" />;
									})()}
								<h1 className="text-3xl font-bold text-foreground">
									{selectedChannel?.name ?? "Channel"}
								</h1>
							</div>
							<p className="text-muted-foreground mt-1">in {server.name}</p>
						</div>
					</div>
				</div>

				{/* Sidebar and Content */}
				<div className="flex gap-8">
					{/* Channels Sidebar */}
					<aside className="hidden md:block w-60 shrink-0">
						<div className="sticky top-8">
							<div className="mb-4">
								<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
									Channels
								</h2>
							</div>
							<nav className="space-y-1">
								{channels.map((channel) => {
									const isSelected = channel.id === selectedChannel?.id;
									const Icon = getChannelIcon(channel.type);
									return (
										<Link
											key={channel.id}
											href={`/c/${server.discordId}/${channel.id}`}
											className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
												isSelected
													? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
													: "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
											}`}
										>
											<Icon className="h-4 w-4 shrink-0" />
											<span className="truncate flex-1">{channel.name}</span>
										</Link>
									);
								})}
							</nav>
						</div>
					</aside>

					{/* Threads List */}
					<div className="flex-1 min-w-0">
						<h2 className="text-xl font-semibold text-foreground mb-4">
							Threads
						</h2>
						{threads.length === 0 ? (
							<div className="text-center py-12 text-muted-foreground">
								No threads found in this channel
							</div>
						) : (
							<div className="space-y-3">
								{threads.map(({ thread, message }) => {
									const messageDate = getSnowflakeDate(message.id);
									const formattedDate = formatRelativeTime(messageDate);
									return (
										<Link
											key={thread.id}
											href={`/m/${message.id}`}
											className="block rounded-lg border border-border bg-card p-5 transition-all hover:border-sidebar-border hover:bg-accent/50"
										>
											<div className="flex items-start gap-4">
												<div className="flex-1 min-w-0">
													<h3 className="font-semibold text-card-foreground mb-1 line-clamp-2">
														{thread.name}
													</h3>
													{message.content && (
														<p className="text-sm text-muted-foreground line-clamp-2 mb-2">
															{message.content}
														</p>
													)}
													<div className="text-xs text-muted-foreground">
														{formattedDate}
													</div>
												</div>
											</div>
										</Link>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
