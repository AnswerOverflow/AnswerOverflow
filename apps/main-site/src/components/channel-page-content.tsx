import type { api } from "@packages/database/convex/_generated/api";
import { Link } from "@packages/ui/components/link";
import { MessageBody } from "@packages/ui/components/message-body";
import type { FunctionReturnType } from "convex/server";
import { Hash, MessageSquare } from "lucide-react";

type ChannelPageData = NonNullable<
	FunctionReturnType<typeof api.private.channels.getChannelPageData>
> & {
	showBackLink?: boolean;
};

function getChannelIcon(type: number) {
	if (type === 15) return MessageSquare;
	return Hash;
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

export function ChannelPageContent({
	server,
	channels,
	selectedChannel,
	threads,
	showBackLink = true,
}: ChannelPageData) {
	const serverIcon = server.icon ?? null;
	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8 pb-6 border-b border-border">
					{showBackLink && (
						<div className="flex items-center gap-4 mb-2">
							<Link
								href={`/c/${server.discordId}`}
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								← Back to {server.name}
							</Link>
						</div>
					)}
					<div className="flex items-center gap-4">
						{serverIcon && (
							<img
								src={`https://cdn.discordapp.com/icons/${server.discordId}/${serverIcon}.webp?size=64`}
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

				<div className="flex gap-8">
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
									const messageDate = getSnowflakeDate(message.message.id);
									const formattedDate = formatRelativeTime(messageDate);
									return (
										<Link
											key={thread.id}
											href={`/m/${message.message.id}`}
											className="block rounded-lg border border-border bg-card p-5 transition-all hover:border-sidebar-border hover:bg-accent/50"
										>
											<div className="flex flex-col gap-2">
												<div className="flex items-center justify-between">
													<h3 className="font-semibold text-card-foreground line-clamp-2">
														{thread.name}
													</h3>
													<div className="text-xs text-muted-foreground shrink-0 ml-2">
														{formattedDate}
													</div>
												</div>
												<div className="text-sm">
													<MessageBody
														message={message}
														collapseContent={true}
													/>
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
