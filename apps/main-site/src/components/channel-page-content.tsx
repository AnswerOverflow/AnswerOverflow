"use client";

import type { api } from "@packages/database/convex/_generated/api";
import { Button } from "@packages/ui/components/button";
import { Link } from "@packages/ui/components/link";
import { MessagePreviewCard } from "@packages/ui/components/message-preview-card";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@packages/ui/components/sheet";
import { useTenant } from "@packages/ui/components/tenant-context";
import type { FunctionReturnType } from "convex/server";
import { ChevronDown, Hash, MessageSquare } from "lucide-react";
import { useState } from "react";

type ChannelPageData = NonNullable<
	FunctionReturnType<typeof api.private.channels.getChannelPageData>
>;

function getChannelIcon(type: number) {
	if (type === 15) return MessageSquare;
	return Hash;
}

function MobileChannelSelector({
	channels,
	selectedChannel,
	serverDiscordId,
	tenantMode,
}: {
	channels: ChannelPageData["channels"];
	selectedChannel: ChannelPageData["selectedChannel"];
	serverDiscordId: bigint;
	tenantMode: boolean;
}) {
	const [open, setOpen] = useState(false);

	const getChannelHref = (channelId: bigint) =>
		tenantMode
			? `/c/${channelId.toString()}`
			: `/c/${serverDiscordId.toString()}/${channelId.toString()}`;

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="outline" className="md:hidden flex items-center gap-2">
					{selectedChannel &&
						(() => {
							const Icon = getChannelIcon(selectedChannel.type);
							return <Icon className="h-4 w-4" />;
						})()}
					<span className="truncate max-w-[150px]">
						{selectedChannel?.name ?? "Select channel"}
					</span>
					<ChevronDown className="h-4 w-4 shrink-0" />
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-[280px] p-0">
				<SheetHeader className="border-b border-border">
					<SheetTitle>Channels</SheetTitle>
				</SheetHeader>
				<nav className="flex-1 overflow-y-auto p-2">
					<div className="space-y-1">
						{channels.map((channel) => {
							const isSelected = channel.id === selectedChannel?.id;
							const Icon = getChannelIcon(channel.type);
							return (
								<Link
									key={channel.id.toString()}
									href={getChannelHref(channel.id)}
									onClick={() => setOpen(false)}
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
					</div>
				</nav>
			</SheetContent>
		</Sheet>
	);
}

export function ChannelPageContent({
	server,
	channels,
	selectedChannel,
	threads,
}: ChannelPageData) {
	const tenant = useTenant();
	const tenantMode = !!tenant;
	const serverIcon = server.icon ?? null;

	const getChannelHref = (channelId: bigint) =>
		tenantMode
			? `/c/${channelId.toString()}`
			: `/c/${server.discordId.toString()}/${channelId.toString()}`;

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8 pb-6 border-b border-border">
					<div className="flex items-center gap-4">
						{serverIcon && (
							<img
								src={`https://cdn.discordapp.com/icons/${server.discordId}/${serverIcon}.webp?size=64`}
								alt={server.name}
								className="w-16 h-16 rounded-full"
							/>
						)}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								{selectedChannel &&
									(() => {
										const Icon = getChannelIcon(selectedChannel.type);
										return (
											<Icon className="h-5 w-5 text-muted-foreground hidden md:block" />
										);
									})()}
								<h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">
									{selectedChannel?.name ?? "Channel"}
								</h1>
							</div>
							<p className="text-muted-foreground mt-1 text-sm md:text-base">
								in {server.name}
							</p>
						</div>
					</div>
					<div className="mt-4">
						<MobileChannelSelector
							channels={channels}
							selectedChannel={selectedChannel}
							serverDiscordId={server.discordId}
							tenantMode={tenantMode}
						/>
					</div>
				</div>

				<div className="flex gap-8">
					<aside className="hidden md:block w-60 shrink-0">
						<div className="sticky top-[calc(var(--navbar-height)+1rem)]">
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
											key={channel.id.toString()}
											href={getChannelHref(channel.id)}
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
							<div className="space-y-4">
								{threads.map(({ thread, message }) => (
									<MessagePreviewCard
										key={thread.id.toString()}
										enrichedMessage={message}
										href={`/m/${message.message.id.toString()}`}
										ariaLabel={`Open thread: ${thread.name}`}
									/>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
