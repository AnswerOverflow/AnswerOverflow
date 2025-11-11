"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Checkbox } from "@packages/ui/components/checkbox";
import { Input } from "@packages/ui/components/input";
import { Label } from "@packages/ui/components/label";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { Switch } from "@packages/ui/components/switch";
import { useMutation, useQuery } from "convex/react";
import { Hash, Megaphone, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import React from "react";
import { SettingsNav } from "../components/settings-nav";

function ToggleChannelFlag({
	title,
	description,
	flagKey: _flagKey,
	checked,
	onChange,
	disabled,
	disabledReason,
	isMixed,
}: {
	title: string;
	description: string;
	flagKey:
		| "indexingEnabled"
		| "markSolutionEnabled"
		| "sendMarkSolutionInstructionsInNewThreads"
		| "autoThreadEnabled"
		| "forumGuidelinesConsentEnabled";
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	disabledReason?: string;
	isMixed?: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>
					{description}
					{isMixed && (
						<span className="block mt-2 text-muted-foreground text-sm">
							Selected channels have different values. Toggling will set all to
							the same value.
						</span>
					)}
					{disabled && disabledReason && (
						<span className="block mt-2 text-destructive">
							{disabledReason}
						</span>
					)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-2">
					<Switch
						checked={checked}
						onCheckedChange={onChange}
						disabled={disabled}
					/>
					<Label>Enabled</Label>
				</div>
			</CardContent>
		</Card>
	);
}

export default function ChannelsPage() {
	const params = useParams();
	const serverId = params.serverId as Id<"servers">;

	// URL state for selected channels and search
	const [selectedChannelIdsParam, setSelectedChannelIdsParam] = useQueryState(
		"channels",
		{
			defaultValue: "",
		},
	);
	const [channelSearchQuery, setChannelSearchQuery] = useQueryState("search", {
		defaultValue: "",
	});

	// Convert comma-separated string to/from Set
	const selectedChannelIds = React.useMemo(() => {
		if (!selectedChannelIdsParam) return new Set<string>();
		return new Set(selectedChannelIdsParam.split(",").filter(Boolean));
	}, [selectedChannelIdsParam]);

	const setSelectedChannelIds = React.useCallback(
		(updater: (prev: Set<string>) => Set<string>) => {
			const newSet = updater(selectedChannelIds);
			if (newSet.size === 0) {
				setSelectedChannelIdsParam(null);
			} else {
				setSelectedChannelIdsParam(Array.from(newSet).join(","));
			}
		},
		[selectedChannelIds, setSelectedChannelIdsParam],
	);

	const dashboardData = useQuery(api.dashboard_queries.getDashboardData, {
		serverId,
	});

	// Filter channels based on search query - must be before conditional return
	const filteredChannels = React.useMemo(() => {
		if (!dashboardData?.channels) {
			return [];
		}
		const searchQuery = channelSearchQuery ?? "";
		if (!searchQuery.trim()) {
			return dashboardData.channels;
		}
		const query = searchQuery.toLowerCase();
		return dashboardData.channels.filter((channel: { name: string }) =>
			channel.name.toLowerCase().includes(query),
		);
	}, [dashboardData?.channels, channelSearchQuery]);

	const updateChannelSettings = useMutation(
		api.dashboard_mutations.updateChannelSettingsFlags,
	).withOptimisticUpdate((localStore, args) => {
		const currentData = localStore.getQuery(
			api.dashboard_queries.getDashboardData,
			{ serverId },
		);
		if (currentData !== undefined) {
			localStore.setQuery(
				api.dashboard_queries.getDashboardData,
				{ serverId },
				{
					...currentData,
					channels: currentData.channels.map((channel) =>
						channel.id === args.channelId
							? {
									...channel,
									flags: {
										...channel.flags,
										...args.flags,
									},
								}
							: channel,
					),
				},
			);
		}
	});

	if (!dashboardData) {
		return (
			<main className="max-w-7xl mx-auto p-6 lg:p-8">
				<div className="text-muted-foreground">Loading channel settings...</div>
			</main>
		);
	}

	const { server, channels } = dashboardData;
	const selectedChannels = channels.filter((c: { id: string }) =>
		selectedChannelIds.has(c.id),
	);

	// Helper function to get channel icon and type name
	const getChannelInfo = (type: number) => {
		if (type === 15) {
			return { Icon: MessageSquare, typeName: "Forum" };
		}
		if (type === 5) {
			return { Icon: Megaphone, typeName: "Announcement" };
		}
		return { Icon: Hash, typeName: "Text" };
	};

	// Helper to check if all selected channels have the same value for a flag
	const getFlagValue = (
		flagKey:
			| "indexingEnabled"
			| "markSolutionEnabled"
			| "sendMarkSolutionInstructionsInNewThreads"
			| "autoThreadEnabled"
			| "forumGuidelinesConsentEnabled",
	): boolean | "mixed" => {
		if (selectedChannels.length === 0) return false;
		const values = selectedChannels.map((c) => c.flags[flagKey]);
		const firstValue = values[0];
		if (values.every((v) => v === firstValue)) {
			return firstValue ?? false;
		}
		return "mixed";
	};

	// Helper to check if a flag should be disabled
	const isFlagDisabled = (
		flagKey:
			| "indexingEnabled"
			| "markSolutionEnabled"
			| "sendMarkSolutionInstructionsInNewThreads"
			| "autoThreadEnabled"
			| "forumGuidelinesConsentEnabled",
	): boolean => {
		if (flagKey === "sendMarkSolutionInstructionsInNewThreads") {
			return getFlagValue("markSolutionEnabled") !== true;
		}
		if (flagKey === "forumGuidelinesConsentEnabled") {
			return !selectedChannels.some((c) => c.type === 15);
		}
		return false;
	};

	const toggleChannelSelection = (channelId: string) => {
		setSelectedChannelIds((prev) => {
			const next = new Set(prev);
			if (next.has(channelId)) {
				next.delete(channelId);
			} else {
				next.add(channelId);
			}
			return next;
		});
	};

	const handleChannelToggle = async (
		flagKey:
			| "indexingEnabled"
			| "markSolutionEnabled"
			| "sendMarkSolutionInstructionsInNewThreads"
			| "autoThreadEnabled"
			| "forumGuidelinesConsentEnabled",
		checked: boolean,
	) => {
		if (selectedChannels.length === 0) return;
		try {
			// Update all selected channels
			await Promise.all(
				selectedChannels.map((channel) =>
					updateChannelSettings({
						channelId: channel.id,
						flags: {
							[flagKey]: checked,
						},
					}),
				),
			);
		} catch (error) {
			console.error("Failed to update channel settings:", error);
		}
	};

	return (
		<main className="max-w-7xl mx-auto p-6 lg:p-8">
			<div className="mb-8">
				<Button variant="ghost" asChild>
					<Link href="/dashboard">← Back to Servers</Link>
				</Button>
			</div>

			<div className="mb-8 flex items-center gap-4">
				<ServerIcon
					server={{
						discordId: server.discordId,
						name: server.name,
						icon: server.icon ?? undefined,
					}}
					size={64}
				/>
				<div>
					<h1 className="text-3xl font-bold">{server.name}</h1>
				</div>
			</div>

			<div className="mb-8">
				<SettingsNav />
			</div>

			{channels.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>No channels found</CardTitle>
						<CardDescription>
							No channels are available for this server yet.
						</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<div className="flex gap-6">
					{/* Sidebar with channel selection */}
					<div className="w-80 shrink-0 flex flex-col border rounded-lg sticky top-6 self-start max-h-[calc(100vh-8rem)]">
						<div className="p-4 border-b shrink-0">
							<h3 className="font-semibold mb-3">Select Channels</h3>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
								<Input
									type="search"
									placeholder="Search channels..."
									value={channelSearchQuery ?? ""}
									onChange={(e) =>
										setChannelSearchQuery(e.target.value || null)
									}
									className="pl-9"
								/>
							</div>
						</div>
						<div className="flex-1 overflow-y-auto p-2 min-h-0">
							<div className="space-y-1">
								{filteredChannels.length === 0 ? (
									<div className="text-center text-muted-foreground py-8 text-sm">
										No channels found matching "{channelSearchQuery ?? ""}"
									</div>
								) : (
									filteredChannels.map(
										(channel: { id: string; name: string; type: number }) => {
											const { Icon, typeName } = getChannelInfo(channel.type);
											const isSelected = selectedChannelIds.has(channel.id);
											return (
												<label
													key={channel.id}
													className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
												>
													<Checkbox
														checked={isSelected}
														onCheckedChange={() =>
															toggleChannelSelection(channel.id)
														}
													/>
													<Icon className="size-4 shrink-0 text-muted-foreground" />
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2">
															<span className="font-medium truncate text-sm">
																{channel.name}
															</span>
															<span className="text-xs text-muted-foreground shrink-0">
																{typeName}
															</span>
														</div>
													</div>
												</label>
											);
										},
									)
								)}
							</div>
						</div>
					</div>

					{/* Main content area with settings */}
					<div className="flex-1">
						{selectedChannels.length === 0 ? (
							<Card>
								<CardHeader>
									<CardTitle>No channels selected</CardTitle>
									<CardDescription>
										Select one or more channels from the sidebar to configure
										their settings.
									</CardDescription>
								</CardHeader>
							</Card>
						) : (
							<div className="space-y-6">
								<div>
									<h2 className="text-xl font-semibold">
										Configure {selectedChannels.length} Channel
										{selectedChannels.length !== 1 ? "s" : ""}
									</h2>
									<p className="text-sm text-muted-foreground mt-1">
										Settings will be applied to all selected channels
									</p>
								</div>

								<div className="space-y-6">
									<ToggleChannelFlag
										title="Indexing Enabled"
										description="Enable indexing of a channel. Indexing can take up to 24 hours to collect initial data depending on the channel volume."
										flagKey="indexingEnabled"
										checked={getFlagValue("indexingEnabled") === true}
										isMixed={getFlagValue("indexingEnabled") === "mixed"}
										onChange={(checked) =>
											handleChannelToggle("indexingEnabled", checked)
										}
									/>

									<ToggleChannelFlag
										title="Mark Solution Enabled"
										description="Highlights the marked solution under the user's question."
										flagKey="markSolutionEnabled"
										checked={getFlagValue("markSolutionEnabled") === true}
										isMixed={getFlagValue("markSolutionEnabled") === "mixed"}
										onChange={(checked) =>
											handleChannelToggle("markSolutionEnabled", checked)
										}
									/>

									<ToggleChannelFlag
										title="Auto Thread Enabled"
										description="Automatically create threads for messages in this channel."
										flagKey="autoThreadEnabled"
										checked={getFlagValue("autoThreadEnabled") === true}
										isMixed={getFlagValue("autoThreadEnabled") === "mixed"}
										onChange={(checked) =>
											handleChannelToggle("autoThreadEnabled", checked)
										}
									/>

									<ToggleChannelFlag
										title="Send Mark Solution Instructions in New Threads"
										description="Enables the bot to provide instructions to users on how to mark a solution in new threads."
										flagKey="sendMarkSolutionInstructionsInNewThreads"
										checked={
											getFlagValue(
												"sendMarkSolutionInstructionsInNewThreads",
											) === true
										}
										isMixed={
											getFlagValue(
												"sendMarkSolutionInstructionsInNewThreads",
											) === "mixed"
										}
										onChange={(checked) =>
											handleChannelToggle(
												"sendMarkSolutionInstructionsInNewThreads",
												checked,
											)
										}
										disabled={isFlagDisabled(
											"sendMarkSolutionInstructionsInNewThreads",
										)}
										disabledReason="This option is only available if mark solution is enabled for all selected channels."
									/>

									{selectedChannels.some((c) => c.type === 15) && (
										<ToggleChannelFlag
											title="Forum Guidelines Consent Enabled"
											description="Marks all posts as public, and disables Username Anonymization for the selected channel. If enabled, add a public message disclaimer to your forum guidelines."
											flagKey="forumGuidelinesConsentEnabled"
											checked={
												getFlagValue("forumGuidelinesConsentEnabled") === true
											}
											isMixed={
												getFlagValue("forumGuidelinesConsentEnabled") ===
												"mixed"
											}
											onChange={(checked) =>
												handleChannelToggle(
													"forumGuidelinesConsentEnabled",
													checked,
												)
											}
										/>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</main>
	);
}
