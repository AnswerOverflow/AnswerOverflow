import type { ForumTag } from "@packages/database/convex/schema";
import { Badge } from "@packages/ui/components/badge";
import { Tag } from "lucide-react";

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

function TagBadge({ tag }: { tag: ForumTag }) {
	return (
		<Badge variant="secondary" className="gap-1 text-xs">
			<TagEmoji tag={tag} />
			{tag.name}
		</Badge>
	);
}

export type ThreadTagsProps = {
	appliedTagIds: bigint[];
	availableTags: ForumTag[];
};

export function ThreadTags({ appliedTagIds, availableTags }: ThreadTagsProps) {
	if (appliedTagIds.length === 0 || availableTags.length === 0) {
		return null;
	}

	const appliedTags = appliedTagIds
		.map((tagId) => availableTags.find((t) => t.id === tagId))
		.filter((tag): tag is ForumTag => tag !== undefined);

	if (appliedTags.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<Tag className="size-3.5 text-muted-foreground" />
			{appliedTags.map((tag) => (
				<TagBadge key={tag.id.toString()} tag={tag} />
			))}
		</div>
	);
}
