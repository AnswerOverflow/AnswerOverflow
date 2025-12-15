"use client";

import { Checkbox } from "@packages/ui/components/checkbox";
import { Hash, Megaphone, MessageSquare } from "lucide-react";
import type { ChannelRecommendation } from "./wizard-context";

const CHANNEL_TYPE_FORUM = 15;
const CHANNEL_TYPE_ANNOUNCEMENT = 5;

function getChannelIcon(type: number) {
	if (type === CHANNEL_TYPE_FORUM) return MessageSquare;
	if (type === CHANNEL_TYPE_ANNOUNCEMENT) return Megaphone;
	return Hash;
}

type ChannelListProps = {
	channels: Array<ChannelRecommendation>;
	selectedIds: Set<string>;
	onToggle: (channelId: string) => void;
	onSelectAll?: (channelIds: Array<string>, selected: boolean) => void;
	showSelectAll?: boolean;
	emptyMessage?: string;
};

export function ChannelList({
	channels,
	selectedIds,
	onToggle,
	onSelectAll,
	showSelectAll = true,
	emptyMessage = "No channels available",
}: ChannelListProps) {
	if (channels.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				{emptyMessage}
			</div>
		);
	}

	const allSelected = channels.every((c) => selectedIds.has(c.id.toString()));
	const someSelected = channels.some((c) => selectedIds.has(c.id.toString()));

	const handleSelectAll = () => {
		if (!onSelectAll) return;
		const channelIds = channels.map((c) => c.id.toString());
		onSelectAll(channelIds, !allSelected);
	};

	return (
		<div className="space-y-1">
			{showSelectAll && onSelectAll && (
				<div className="flex items-center gap-3 p-3 border-b mb-2">
					<Checkbox
						checked={
							allSelected ? true : someSelected ? "indeterminate" : false
						}
						onCheckedChange={handleSelectAll}
					/>
					<span className="text-sm font-medium text-muted-foreground">
						{allSelected ? "Deselect all" : "Select all"}
					</span>
				</div>
			)}
			<div className="max-h-[400px] overflow-y-auto space-y-1">
				{channels.map((channel) => {
					const Icon = getChannelIcon(channel.type);
					const isSelected = selectedIds.has(channel.id.toString());

					return (
						<div
							key={channel.id.toString()}
							className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
							onClick={() => onToggle(channel.id.toString())}
						>
							<Checkbox
								checked={isSelected}
								onCheckedChange={() => onToggle(channel.id.toString())}
								onClick={(e) => e.stopPropagation()}
							/>
							<Icon className="h-4 w-4 text-muted-foreground shrink-0" />
							<span className="font-medium truncate">{channel.name}</span>
							{channel.shouldIndex && (
								<span className="ml-auto text-xs text-muted-foreground shrink-0">
									Recommended
								</span>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
