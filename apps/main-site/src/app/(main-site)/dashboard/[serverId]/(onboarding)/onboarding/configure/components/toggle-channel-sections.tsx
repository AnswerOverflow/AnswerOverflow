"use client";

import { Checkbox } from "@packages/ui/components/checkbox";
import { Input } from "@packages/ui/components/input";
import { ChannelType } from "discord-api-types/v10";
import { Hash, Megaphone, MessageSquare, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ChannelInfo } from "./wizard-context";

const SEARCH_THRESHOLD = 6;

function getChannelIcon(type: number) {
	if (type === ChannelType.GuildForum) return MessageSquare;
	if (type === ChannelType.GuildAnnouncement) return Megaphone;
	return Hash;
}

type ChannelItemProps = {
	channel: ChannelInfo;
	isSelected: boolean;
	onToggle: () => void;
};

function ChannelItem({ channel, isSelected, onToggle }: ChannelItemProps) {
	const Icon = getChannelIcon(channel.type);

	return (
		<div
			role="button"
			tabIndex={0}
			className="flex items-center gap-3 px-3 py-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
			onClick={onToggle}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onToggle();
				}
			}}
		>
			<Checkbox
				checked={isSelected}
				onCheckedChange={onToggle}
				onClick={(e) => e.stopPropagation()}
			/>
			<Icon className="h-4 w-4 text-muted-foreground shrink-0" />
			<span className="font-medium truncate flex-1 text-sm">
				{channel.name}
			</span>
		</div>
	);
}

type ChannelListProps = {
	channels: Array<ChannelInfo>;
	selectedIds: Set<string>;
	onToggle: (channelId: string) => void;
	onSelectAll: (channelIds: Array<string>, enabled: boolean) => void;
	initialSelectedIds?: Set<string>;
};

export function ChannelList({
	channels,
	selectedIds,
	onToggle,
	onSelectAll,
	initialSelectedIds,
}: ChannelListProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const showSearch = channels.length >= SEARCH_THRESHOLD;

	const initialSelectedIdsRef = useRef(initialSelectedIds ?? selectedIds);

	const sortedChannels = useMemo(() => {
		const filtered = searchQuery
			? channels.filter((c) =>
					c.name.toLowerCase().includes(searchQuery.toLowerCase()),
				)
			: channels;

		const initialSelected = initialSelectedIdsRef.current;
		return [...filtered].sort((a, b) => {
			const aSelected = initialSelected.has(a.id.toString());
			const bSelected = initialSelected.has(b.id.toString());
			if (aSelected && !bSelected) return -1;
			if (!aSelected && bSelected) return 1;
			return 0;
		});
	}, [channels, searchQuery]);

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
			<div className="text-center py-12 text-muted-foreground min-h-[200px] flex items-center justify-center">
				No channels available
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<Checkbox
						checked={
							allSelected ? true : someSelected ? "indeterminate" : false
						}
						onCheckedChange={handleSelectAll}
					/>
					<span className="text-sm text-muted-foreground">Select all</span>
				</div>
				<span className="text-sm text-muted-foreground">
					{selectedIds.size} of {channels.length} selected
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

			<div className="max-h-[280px] overflow-y-auto space-y-1.5">
				{sortedChannels.length === 0 ? (
					<div className="text-center py-8 text-sm text-muted-foreground">
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
