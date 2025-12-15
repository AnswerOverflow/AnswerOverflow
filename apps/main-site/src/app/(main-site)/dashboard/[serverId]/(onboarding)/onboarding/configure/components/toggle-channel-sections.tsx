"use client";

import { Checkbox } from "@packages/ui/components/checkbox";
import { Input } from "@packages/ui/components/input";
import { Hash, Megaphone, MessageSquare, Search } from "lucide-react";
import { useMemo, useState } from "react";
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
};

function ChannelItem({ channel, isSelected, onToggle }: ChannelItemProps) {
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
		</div>
	);
}

type ChannelListProps = {
	channels: Array<ChannelRecommendation>;
	selectedIds: Set<string>;
	onToggle: (channelId: string) => void;
	onSelectAll: (channelIds: Array<string>, enabled: boolean) => void;
};

export function ChannelList({
	channels,
	selectedIds,
	onToggle,
	onSelectAll,
}: ChannelListProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const showSearch = channels.length >= SEARCH_THRESHOLD;

	const sortedChannels = useMemo(() => {
		const filtered = searchQuery
			? channels.filter((c) =>
					c.name.toLowerCase().includes(searchQuery.toLowerCase()),
				)
			: channels;

		return [...filtered].sort((a, b) => {
			const aSelected = selectedIds.has(a.id.toString());
			const bSelected = selectedIds.has(b.id.toString());
			if (aSelected && !bSelected) return -1;
			if (!aSelected && bSelected) return 1;
			return 0;
		});
	}, [channels, selectedIds, searchQuery]);

	const allSelected =
		sortedChannels.length > 0 &&
		sortedChannels.every((c) => selectedIds.has(c.id.toString()));
	const someSelected = sortedChannels.some((c) =>
		selectedIds.has(c.id.toString()),
	);

	const handleSelectAll = () => {
		const channelIds = sortedChannels.map((c) => c.id.toString());
		onSelectAll(channelIds, !allSelected);
	};

	if (channels.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				No channels available
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-sm text-muted-foreground">
					{selectedIds.size}/{channels.length} selected
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

			<div className="max-h-[300px] overflow-y-auto space-y-1 pt-1">
				{sortedChannels.length === 0 ? (
					<div className="text-center py-4 text-sm text-muted-foreground">
						No channels matching "{searchQuery}"
					</div>
				) : (
					sortedChannels.map((channel) => (
						<ChannelItem
							key={channel.id.toString()}
							channel={channel}
							isSelected={selectedIds.has(channel.id.toString())}
							onToggle={() => onToggle(channel.id.toString())}
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
	enabledChannels,
	availableChannels,
	selectedIds,
	onToggle,
	onSelectAll,
}: ToggleChannelSectionsProps) {
	const allChannels = useMemo(() => {
		return [...enabledChannels, ...availableChannels];
	}, [enabledChannels, availableChannels]);

	return (
		<ChannelList
			channels={allChannels}
			selectedIds={selectedIds}
			onToggle={onToggle}
			onSelectAll={onSelectAll}
		/>
	);
}
