"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { ForumTag } from "@packages/database/convex/schema";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { ChannelBotPermissionsStatus } from "@packages/ui/components/channel-bot-permissions-status";
import { Checkbox } from "@packages/ui/components/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import { EmptyStateCard } from "@packages/ui/components/empty";
import { Input } from "@packages/ui/components/input";
import { Label } from "@packages/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@packages/ui/components/select";
import { Switch } from "@packages/ui/components/switch";
import { useMutation } from "convex/react";
import { ChannelType } from "discord-api-types/v10";
import {
	ChevronDown,
	Hash,
	Layers,
	Megaphone,
	MessageSquare,
	Search,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import React from "react";
import { useAuthenticatedQuery } from "../../../../../../lib/use-authenticated-query";

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
					{isMixed && (
						<span className="text-muted-foreground text-sm ml-2">
							Selected channels have different values. Toggling will set all to
							the same value.
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
function ChooseSolvedTagCard({
	channel,
	onUpdate,
}: {
	channel: {
		id: bigint;
		flags: {
			solutionTagId?: bigint;
		};
		availableTags?: ForumTag[];
	};
	onUpdate: (solutionTagId: bigint | null) => Promise<void>;
}) {
	const tags = channel.availableTags ?? [];
	const solutionTagId = channel.flags.solutionTagId;
	const currentTag = tags.find((t) => t.id === solutionTagId);
	const currentTagInvalid = !!(solutionTagId && !currentTag);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Choose Solved Tag</CardTitle>
				<CardDescription>
					Pick the tag that will be applied when a message is marked as the
					solution.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{tags.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No tags available. Tags will appear after the forum channel is
						synced.
					</p>
				) : (
					<Select
						value={solutionTagId?.toString() ?? "none"}
						onValueChange={async (value) => {
							const tagId = value === "none" ? null : BigInt(value);
							await onUpdate(tagId);
						}}
					>
						<SelectTrigger className="max-w-[250px]">
							<SelectValue placeholder="Select a tag">
								{currentTagInvalid ? (
									<span className="text-muted-foreground">(Unknown tag)</span>
								) : currentTag ? (
									<span className="flex items-center gap-2">
										{currentTag.emojiName && (
											<span>{currentTag.emojiName}</span>
										)}
										{currentTag.emojiId && !currentTag.emojiName && (
											<img
												src={`https://cdn.discordapp.com/emojis/${currentTag.emojiId}.webp?size=16`}
												alt=""
												className="size-4"
											/>
										)}
										<span>{currentTag.name}</span>
									</span>
								) : (
									"(No tag)"
								)}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">(No tag)</SelectItem>
							{tags.map((tag) => (
								<SelectItem key={tag.id.toString()} value={tag.id.toString()}>
									<span className="flex items-center gap-2">
										{tag.emojiName && <span>{tag.emojiName}</span>}
										{tag.emojiId && !tag.emojiName && (
											<img
												src={`https://cdn.discordapp.com/emojis/${tag.emojiId}.webp?size=16`}
												alt=""
												className="size-4"
											/>
										)}
										<span>{tag.name}</span>
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</CardContent>
		</Card>
	);
}

export default function ChannelsPage() {
	const params = useParams();
	const serverId = params.serverId as string;

	const [selectedChannelIdsParam, setSelectedChannelIdsParam] = useQueryState(
		"channels",
		{
			defaultValue: "",
		},
	);
	const [channelSearchQuery, setChannelSearchQuery] = useQueryState("search", {
		defaultValue: "",
	});
	const [channelTypeFilterParam, setChannelTypeFilterParam] = useQueryState(
		"types",
		{
			defaultValue: "",
		},
	);

	const selectedChannelIds = React.useMemo(() => {
		if (!selectedChannelIdsParam) return new Set<bigint>();
		return new Set(
			selectedChannelIdsParam.split(",").filter(Boolean).map(BigInt),
		);
	}, [selectedChannelIdsParam]);

	const channelTypeFilter = React.useMemo(() => {
		if (!channelTypeFilterParam) return new Set<number>();
		return new Set(
			channelTypeFilterParam
				.split(",")
				.map(Number)
				.filter((n) => !Number.isNaN(n)),
		);
	}, [channelTypeFilterParam]);

	const setSelectedChannelIds = React.useCallback(
		(updater: (prev: Set<bigint>) => Set<bigint>) => {
			const newSet = updater(selectedChannelIds);
			if (newSet.size === 0) {
				setSelectedChannelIdsParam(null);
			} else {
				setSelectedChannelIdsParam(
					Array.from(newSet)
						.map((id) => id.toString())
						.join(","),
				);
			}
		},
		[selectedChannelIds, setSelectedChannelIdsParam],
	);

	const dashboardData = useAuthenticatedQuery(
		api.authenticated.dashboard_queries.getDashboardData,
		{
			serverId: BigInt(serverId),
		},
	);

	const filteredChannels = React.useMemo(() => {
		if (!dashboardData?.channels) {
			return [];
		}
		let filtered = dashboardData.channels;

		if (channelTypeFilter && channelTypeFilter.size > 0) {
			filtered = filtered.filter((channel) =>
				channelTypeFilter.has(channel.type),
			);
		}

		const searchQuery = channelSearchQuery ?? "";
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter((channel) =>
				channel.name.toLowerCase().includes(query),
			);
		}

		const typeOrder: Record<number, number> = { 15: 0, 5: 1, 0: 2 };
		filtered = [...filtered].sort(
			(a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99),
		);

		return filtered;
	}, [dashboardData?.channels, channelSearchQuery, channelTypeFilter]);

	const selectAllState = React.useMemo(() => {
		if (filteredChannels.length === 0) return false;
		const selectedCount = filteredChannels.filter((c) =>
			selectedChannelIds.has(c.id),
		).length;
		if (selectedCount === 0) return false;
		if (selectedCount === filteredChannels.length) return true;
		return "indeterminate";
	}, [filteredChannels, selectedChannelIds]);

	const toggleSelectAll = React.useCallback(() => {
		setSelectedChannelIds((prev) => {
			const next = new Set(prev);
			const allSelected = filteredChannels.every((c) => next.has(c.id));
			if (allSelected) {
				filteredChannels.forEach((c) => {
					next.delete(c.id);
				});
			} else {
				filteredChannels.forEach((c) => {
					next.add(c.id);
				});
			}
			return next;
		});
	}, [filteredChannels, setSelectedChannelIds]);

	const updateChannelSettings = useMutation(
		api.authenticated.dashboard_mutations.updateChannelSettingsFlags,
	).withOptimisticUpdate((localStore, args) => {
		const currentData = localStore.getQuery(
			api.authenticated.dashboard_queries.getDashboardData,
			{ serverId: BigInt(serverId) },
		);
		if (currentData !== undefined) {
			localStore.setQuery(
				api.authenticated.dashboard_queries.getDashboardData,
				{ serverId: BigInt(serverId) },
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

	const updateSolutionTag = useMutation(
		api.authenticated.dashboard_mutations.updateChannelSolutionTag,
	).withOptimisticUpdate((localStore, args) => {
		const currentData = localStore.getQuery(
			api.authenticated.dashboard_queries.getDashboardData,
			{ serverId: BigInt(serverId) },
		);
		if (currentData !== undefined) {
			localStore.setQuery(
				api.authenticated.dashboard_queries.getDashboardData,
				{ serverId: BigInt(serverId) },
				{
					...currentData,
					channels: currentData.channels.map((channel) =>
						channel.id === args.channelId
							? {
									...channel,
									flags: {
										...channel.flags,
										solutionTagId: args.solutionTagId ?? undefined,
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
			<div className="text-muted-foreground">Loading channel settings...</div>
		);
	}

	const { channels } = dashboardData;
	const selectedChannels = channels.filter((c) => selectedChannelIds.has(c.id));

	const getChannelInfo = (type: number) => {
		if (type === 15) {
			return { Icon: MessageSquare, typeName: "Forum" };
		}
		if (type === 5) {
			return { Icon: Megaphone, typeName: "Announcement" };
		}
		return { Icon: Hash, typeName: "Text" };
	};

	const channelTypeOptions = [
		{ type: 0, label: "Text", Icon: Hash },
		{ type: 5, label: "Announcement", Icon: Megaphone },
		{ type: 15, label: "Forum", Icon: MessageSquare },
	] as const;

	const toggleChannelTypeFilter = (type: number) => {
		const next = new Set(channelTypeFilter);
		if (next.has(type)) {
			next.delete(type);
		} else {
			next.add(type);
		}
		if (next.size === 0) {
			setChannelTypeFilterParam(null);
		} else {
			setChannelTypeFilterParam(Array.from(next).join(","));
		}
	};

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
		if (values.every((v: boolean | undefined) => v === firstValue)) {
			return firstValue ?? false;
		}
		return "mixed";
	};

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
			return !selectedChannels.some(
				(c: { type: number }) => c.type === ChannelType.GuildForum,
			);
		}
		return false;
	};

	const toggleChannelSelection = (channelId: bigint, shiftKey: boolean) => {
		setSelectedChannelIds((prev) => {
			const next = new Set(prev);
			const isCurrentlySelected = next.has(channelId);

			if (shiftKey) {
				if (isCurrentlySelected) {
					next.delete(channelId);
				} else {
					next.add(channelId);
				}
			} else {
				next.clear();
				if (!isCurrentlySelected) {
					next.add(channelId);
				}
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
			await Promise.all(
				selectedChannels.map((channel: { id: bigint }) =>
					updateChannelSettings({
						channelId: channel.id,
						flags: {
							[flagKey]: checked,
						},
						serverId: BigInt(serverId),
					}),
				),
			);
		} catch (error) {
			console.error("Failed to update channel settings:", error);
		}
	};

	return (
		<>
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
				<div className="mx-auto max-w-[1200px] w-full">
					<div className="flex gap-6">
						{/* Sidebar with channel selection */}
						<div className="hidden lg:flex w-80 shrink-0 flex-col border rounded-lg sticky top-[calc(var(--navbar-height)+1.5rem)] self-start max-h-[calc(100vh-var(--navbar-height)-3rem)]">
							<div className="flex-1 overflow-y-auto p-2 min-h-0">
								<div className="space-y-1">
									<div className="flex items-center gap-2 pl-2 mb-1">
										<Checkbox
											checked={selectAllState}
											onCheckedChange={toggleSelectAll}
										/>
										<div className="relative flex-1">
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
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
									{/* Channel type filter */}
									<div className="px-2 py-1.5 border-t flex items-center gap-3">
										<span className="text-xs text-muted-foreground shrink-0">
											Type:
										</span>
										<div className="flex items-center gap-2 flex-1">
											{channelTypeOptions.map(({ type, label, Icon }) => (
												<label
													key={type}
													className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-accent cursor-pointer transition-colors"
													title={label}
												>
													<Checkbox
														checked={channelTypeFilter?.has(type) ?? false}
														onCheckedChange={() =>
															toggleChannelTypeFilter(type)
														}
														className="size-3.5"
													/>
													<Icon className="size-3 shrink-0 text-muted-foreground" />
												</label>
											))}
										</div>
									</div>
									{filteredChannels.length === 0 ? (
										<div className="text-center text-muted-foreground py-8 text-sm">
											{channelSearchQuery || channelTypeFilter?.size
												? `No channels found${
														channelSearchQuery
															? ` matching "${channelSearchQuery}"`
															: ""
													}${
														channelTypeFilter?.size
															? ` with selected type${channelTypeFilter.size > 1 ? "s" : ""}`
															: ""
													}`
												: "No channels available"}
										</div>
									) : (
										filteredChannels.map((channel) => {
											const { Icon } = getChannelInfo(channel.type);
											const isSelected = selectedChannelIds.has(channel.id);
											return (
												<div
													key={channel.id.toString()}
													className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors select-none"
													onClick={(e) =>
														toggleChannelSelection(channel.id, e.shiftKey)
													}
												>
													<Checkbox
														checked={isSelected}
														onClick={(e) => {
															e.stopPropagation();
															toggleChannelSelection(channel.id, e.shiftKey);
														}}
													/>
													<Icon className="size-4 shrink-0 text-muted-foreground" />
													<span className="font-medium truncate text-sm flex-1 min-w-0">
														{channel.name}
													</span>
												</div>
											);
										})
									)}
								</div>
							</div>
						</div>

						{/* Main content area with settings */}
						<div className="flex-1 min-w-0">
							<div className="max-w-[800px] w-full">
								{/* Mobile Channel Selector - Only visible on mobile */}
								<div className="lg:hidden mb-6">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												className="w-full justify-between"
											>
												<span className="flex items-center gap-2">
													{selectedChannels.length === 0 ? (
														"Select channels"
													) : selectedChannels.length === 1 &&
														selectedChannels[0] ? (
														<>
															{(() => {
																const channel = selectedChannels[0];
																const { Icon } = getChannelInfo(channel.type);
																return (
																	<Icon className="size-4 text-muted-foreground" />
																);
															})()}
															{selectedChannels[0].name}
														</>
													) : (
														<>
															<Layers className="size-4 text-muted-foreground" />
															{selectedChannels.length} channels selected
														</>
													)}
												</span>
												<ChevronDown className="size-4 opacity-50" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											className="w-[calc(100vw-2rem)] max-w-[400px] max-h-[60vh] overflow-y-auto"
											align="start"
										>
											{/* Search input */}
											<div className="px-2 py-1.5">
												<div className="relative">
													<Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
													<Input
														type="search"
														placeholder="Search channels..."
														value={channelSearchQuery ?? ""}
														onChange={(e) =>
															setChannelSearchQuery(e.target.value || null)
														}
														className="pl-8 h-8"
														onClick={(e) => e.stopPropagation()}
													/>
												</div>
											</div>
											{/* Channel type filter */}
											<div className="px-2 py-1.5 border-t flex items-center gap-2">
												<span className="text-xs text-muted-foreground shrink-0">
													Type:
												</span>
												<div className="flex items-center gap-2 flex-1">
													{channelTypeOptions.map(({ type, label, Icon }) => (
														<label
															key={type}
															className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-accent cursor-pointer transition-colors"
															title={label}
														>
															<Checkbox
																checked={channelTypeFilter?.has(type) ?? false}
																onCheckedChange={() =>
																	toggleChannelTypeFilter(type)
																}
																className="size-3.5"
															/>
															<Icon className="size-3 shrink-0 text-muted-foreground" />
														</label>
													))}
												</div>
											</div>
											<DropdownMenuSeparator />
											{/* Channel list */}
											{filteredChannels.length === 0 ? (
												<div className="px-2 py-4 text-center text-sm text-muted-foreground">
													{channelSearchQuery || channelTypeFilter?.size
														? `No channels found${
																channelSearchQuery
																	? ` matching "${channelSearchQuery}"`
																	: ""
															}${
																channelTypeFilter?.size
																	? ` with selected type${channelTypeFilter.size > 1 ? "s" : ""}`
																	: ""
															}`
														: "No channels available"}
												</div>
											) : (
												filteredChannels.map((channel) => {
													const { Icon } = getChannelInfo(channel.type);
													const isSelected = selectedChannelIds.has(channel.id);
													return (
														<DropdownMenuCheckboxItem
															key={channel.id.toString()}
															checked={isSelected}
															onCheckedChange={() => {}}
															onClick={(e) =>
																toggleChannelSelection(channel.id, e.shiftKey)
															}
															onSelect={(e) => e.preventDefault()}
															className="select-none"
														>
															<div className="flex items-center gap-2 flex-1 min-w-0">
																<Icon className="size-4 shrink-0 text-muted-foreground" />
																<span className="truncate font-medium">
																	{channel.name}
																</span>
															</div>
														</DropdownMenuCheckboxItem>
													);
												})
											)}
										</DropdownMenuContent>
									</DropdownMenu>
								</div>

								<div className="space-y-6">
									<div>
										<h2 className="font-semibold flex items-center gap-2">
											{selectedChannels.length === 0 ? (
												<>
													<Layers className="size-4 text-muted-foreground" />
													Configure channels
												</>
											) : selectedChannels.length === 1 &&
												selectedChannels[0] ? (
												<>
													{(() => {
														const { Icon } = getChannelInfo(
															selectedChannels[0].type,
														);
														return (
															<Icon className="size-4 text-muted-foreground" />
														);
													})()}
													Configure {selectedChannels[0].name}
												</>
											) : (
												<>
													<Layers className="size-4 text-muted-foreground" />
													Configure {selectedChannels.length} Channels
												</>
											)}
										</h2>
										<p className="text-sm text-muted-foreground mt-1">
											{selectedChannels.length > 1
												? "Settings will be applied to all selected channels"
												: "Hold Shift and click to select multiple channels"}
										</p>
									</div>

									{selectedChannels.length === 0 ? (
										<EmptyStateCard
											icon={Hash}
											title="No channels selected"
											description="Select one or more channels from the dropdown above to configure their settings."
										/>
									) : (
										<div className="space-y-6">
											{selectedChannels.length === 1 && selectedChannels[0] && (
												<ChannelBotPermissionsStatus
													botPermissions={selectedChannels[0].botPermissions?.toString()}
													channelName={selectedChannels[0].name}
												/>
											)}
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
												isMixed={
													getFlagValue("markSolutionEnabled") === "mixed"
												}
												onChange={(checked) =>
													handleChannelToggle("markSolutionEnabled", checked)
												}
											/>

											{selectedChannels.length === 1 &&
												selectedChannels[0] &&
												selectedChannels[0].type === ChannelType.GuildForum && (
													<ChooseSolvedTagCard
														channel={selectedChannels[0]}
														onUpdate={async (solutionTagId) => {
															const channel = selectedChannels[0];
															if (!channel) return;
															await updateSolutionTag({
																channelId: channel.id,
																solutionTagId,
																serverId: BigInt(serverId),
															});
														}}
													/>
												)}

											{!selectedChannels.some(
												(c: { type: number }) =>
													c.type === ChannelType.GuildForum,
											) && (
												<ToggleChannelFlag
													title="Auto Thread Enabled"
													description="Automatically create threads for messages in this channel."
													flagKey="autoThreadEnabled"
													checked={getFlagValue("autoThreadEnabled") === true}
													isMixed={
														getFlagValue("autoThreadEnabled") === "mixed"
													}
													onChange={(checked) =>
														handleChannelToggle("autoThreadEnabled", checked)
													}
												/>
											)}

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

											{selectedChannels.some(
												(c: { type: number }) =>
													c.type === ChannelType.GuildForum,
											) && (
												<ToggleChannelFlag
													title="Forum Guidelines Consent Enabled"
													description="Marks all posts as public, and disables Username Anonymization for the selected channel. If enabled, add a public message disclaimer to your forum guidelines."
													flagKey="forumGuidelinesConsentEnabled"
													checked={
														getFlagValue("forumGuidelinesConsentEnabled") ===
														true
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
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
