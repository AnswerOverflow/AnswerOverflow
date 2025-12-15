"use client";

import { Checkbox } from "@packages/ui/components/checkbox";
import { Input } from "@packages/ui/components/input";
import { Hash, Megaphone, MessageSquare, Search } from "lucide-react";
import { useState } from "react";
import type { ChannelRecommendation } from "./wizard-context";

const CHANNEL_TYPE_FORUM = 15;
const CHANNEL_TYPE_ANNOUNCEMENT = 5;
const SEARCH_THRESHOLD = 6;

function getChannelIcon(type: number) {
	if (type === CHANNEL_TYPE_FORUM) return MessageSquare;
	if (type === CHANNEL_TYPE_ANNOUNCEMENT) return Megaphone;
	return Hash;
}

type ChannelItemProps = {
	channel: ChannelRecommendation;
	isSelected: boolean;
	onToggle: () => void;
	showRecommended?: boolean;
};

function ChannelItem({
	channel,
	isSelected,
	onToggle,
	showRecommended = false,
}: ChannelItemProps) {
	const Icon = getChannelIcon(channel.type);

	return (
		<div
			className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
			onClick={onToggle}
		>
			<Checkbox
				checked={isSelected}
				onCheckedChange={onToggle}
				onClick={(e) => e.stopPropagation()}
			/>
			<Icon className="h-4 w-4 text-muted-foreground shrink-0" />
			<span className="font-medium truncate flex-1">{channel.name}</span>
			{showRecommended && channel.shouldIndex && (
				<span className="text-xs text-muted-foreground shrink-0">
					Recommended
				</span>
			)}
		</div>
	);
}

type ChannelSectionProps = {
	title: string;
	channels: Array<ChannelRecommendation>;
	selectedIds: Set<string>;
	onToggle: (channelId: string) => void;
	onSelectAll: (channelIds: Array<string>, enabled: boolean) => void;
	showRecommended?: boolean;
	emptyMessage?: string;
};

function ChannelSection({
	title,
	channels,
	selectedIds,
	onToggle,
	onSelectAll,
	showRecommended = false,
	emptyMessage = "No channels",
}: ChannelSectionProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const showSearch = channels.length >= SEARCH_THRESHOLD;

	const filteredChannels = searchQuery
		? channels.filter((c) =>
				c.name.toLowerCase().includes(searchQuery.toLowerCase()),
			)
		: channels;

	const allSelected =
		filteredChannels.length > 0 &&
		filteredChannels.every((c) => selectedIds.has(c.id.toString()));
	const someSelected = filteredChannels.some((c) =>
		selectedIds.has(c.id.toString()),
	);

	const handleSelectAll = () => {
		const channelIds = filteredChannels.map((c) => c.id.toString());
		onSelectAll(channelIds, !allSelected);
	};

	if (channels.length === 0) {
		return null;
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
				<span className="text-xs text-muted-foreground">
					{channels.filter((c) => selectedIds.has(c.id.toString())).length}/
					{channels.length} selected
				</span>
			</div>

			{showSearch && (
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Search channels..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
			)}

			<div className="flex items-center gap-3 py-1">
				<Checkbox
					checked={allSelected ? true : someSelected ? "indeterminate" : false}
					onCheckedChange={handleSelectAll}
				/>
				<span className="text-sm text-muted-foreground">
					{allSelected ? "Deselect all" : "Select all"}
				</span>
			</div>

			<div className="max-h-[250px] sm:max-h-[300px] overflow-y-auto space-y-1 pt-1">
				{filteredChannels.length === 0 ? (
					<div className="text-center py-4 text-sm text-muted-foreground">
						{searchQuery
							? `No channels matching "${searchQuery}"`
							: emptyMessage}
					</div>
				) : (
					filteredChannels.map((channel) => (
						<ChannelItem
							key={channel.id.toString()}
							channel={channel}
							isSelected={selectedIds.has(channel.id.toString())}
							onToggle={() => onToggle(channel.id.toString())}
							showRecommended={showRecommended}
						/>
					))
				)}
			</div>
		</div>
	);
}

type ToggleChannelSectionsProps = {
	enabledTitle: string;
	availableTitle: string;
	enabledChannels: Array<ChannelRecommendation>;
	availableChannels: Array<ChannelRecommendation>;
	selectedIds: Set<string>;
	onToggle: (channelId: string) => void;
	onSelectAll: (channelIds: Array<string>, enabled: boolean) => void;
	showRecommendedBadge?: boolean;
};

export function ToggleChannelSections({
	enabledTitle,
	availableTitle,
	enabledChannels,
	availableChannels,
	selectedIds,
	onToggle,
	onSelectAll,
	showRecommendedBadge = false,
}: ToggleChannelSectionsProps) {
	const hasEnabled = enabledChannels.length > 0;
	const hasAvailable = availableChannels.length > 0;

	if (!hasEnabled && !hasAvailable) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				No channels available
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
			{hasEnabled && (
				<ChannelSection
					title={enabledTitle}
					channels={enabledChannels}
					selectedIds={selectedIds}
					onToggle={onToggle}
					onSelectAll={onSelectAll}
					showRecommended={showRecommendedBadge}
				/>
			)}

			{hasAvailable && (
				<ChannelSection
					title={availableTitle}
					channels={availableChannels}
					selectedIds={selectedIds}
					onToggle={onToggle}
					onSelectAll={onSelectAll}
					showRecommended={showRecommendedBadge}
				/>
			)}
		</div>
	);
}
