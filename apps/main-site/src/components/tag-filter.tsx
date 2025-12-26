"use client";

import type { ForumTag } from "@packages/database/convex/schema";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import { cn } from "@packages/ui/lib/utils";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { useState } from "react";

const MOBILE_VISIBLE_COUNT = 4;

function TagEmoji({ tag }: { tag: ForumTag }) {
	if (tag.emojiId) {
		return (
			<img
				src={`https://cdn.discordapp.com/emojis/${tag.emojiId}.webp?size=16`}
				alt=""
				className="size-4"
			/>
		);
	}
	if (tag.emojiName) {
		return <span>{tag.emojiName}</span>;
	}
	return null;
}

function TagBadge({
	tag,
	isSelected,
	onToggle,
	className,
}: {
	tag: ForumTag;
	isSelected: boolean;
	onToggle: () => void;
	className?: string;
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			className={cn(
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full",
				className,
			)}
		>
			<Badge
				variant={isSelected ? "default" : "outline"}
				className={cn(
					"gap-1.5 cursor-pointer transition-colors h-7 items-center",
					isSelected
						? "hover:bg-primary/90"
						: "hover:bg-accent hover:text-accent-foreground",
				)}
			>
				<TagEmoji tag={tag} />
				{tag.name}
			</Badge>
		</button>
	);
}

type TagFilterProps = {
	availableTags: ForumTag[];
	selectedTagIds: string[];
	onTagToggle: (tagId: string) => void;
	onClearAll: () => void;
};

export function TagFilter({
	availableTags,
	selectedTagIds,
	onTagToggle,
	onClearAll,
}: TagFilterProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	if (availableTags.length === 0) {
		return null;
	}

	const hasSelection = selectedTagIds.length > 0;
	const needsExpansion = availableTags.length > MOBILE_VISIBLE_COUNT;
	const hiddenCount = availableTags.length - MOBILE_VISIBLE_COUNT;

	const initialTags = availableTags.slice(0, MOBILE_VISIBLE_COUNT);
	const extraTags = availableTags.slice(MOBILE_VISIBLE_COUNT);
	const hasSelectedHiddenTags =
		!isExpanded &&
		extraTags.some((tag) => selectedTagIds.includes(tag.id.toString()));

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Filter className="size-4 text-muted-foreground hidden sm:block" />
			{initialTags.map((tag) => {
				const isSelected = selectedTagIds.includes(tag.id.toString());
				return (
					<TagBadge
						key={tag.id.toString()}
						tag={tag}
						isSelected={isSelected}
						onToggle={() => onTagToggle(tag.id.toString())}
					/>
				);
			})}
			{extraTags.map((tag) => {
				const isSelected = selectedTagIds.includes(tag.id.toString());
				return (
					<TagBadge
						key={tag.id.toString()}
						tag={tag}
						isSelected={isSelected}
						onToggle={() => onTagToggle(tag.id.toString())}
						className={cn("hidden sm:inline-flex", isExpanded && "inline-flex")}
					/>
				);
			})}
			{needsExpansion && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setIsExpanded(!isExpanded)}
					className={cn(
						"h-7 px-2 text-xs sm:hidden",
						hasSelectedHiddenTags && "text-primary",
					)}
				>
					{isExpanded ? (
						<>
							<ChevronUp className="size-3 mr-1" />
							Less
						</>
					) : (
						<>
							<ChevronDown className="size-3 mr-1" />+{hiddenCount} more
						</>
					)}
				</Button>
			)}
			{hasSelection && (
				<button
					type="button"
					onClick={onClearAll}
					className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
				>
					<X className="size-3" />
					Clear
				</button>
			)}
		</div>
	);
}
