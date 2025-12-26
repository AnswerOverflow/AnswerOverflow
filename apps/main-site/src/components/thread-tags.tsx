import type { api } from "@packages/database/convex/_generated/api";
import type { ForumTag } from "@packages/database/convex/schema";
import { Database } from "@packages/database/database";
import { Badge } from "@packages/ui/components/badge";
import { Skeleton } from "@packages/ui/components/skeleton";
import type { FunctionReturnType } from "convex/server";
import { Effect, Exit } from "effect";
import { Tag } from "lucide-react";
import { runtime } from "@/lib/runtime";

type ThreadTagsProps = {
	threadId: string;
	availableTags: ForumTag[];
};

async function fetchThreadTags(
	threadId: string,
): Promise<FunctionReturnType<
	typeof api.public.threadTags.getTagsForThread
> | null> {
	const exit = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.threadTags.getTagsForThread({
			threadId,
		});
	}).pipe(runtime.runPromiseExit);

	if (Exit.isFailure(exit)) {
		return null;
	}
	return exit.value;
}

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

export function ThreadTagsSkeleton() {
	return (
		<div className="flex flex-wrap gap-1.5">
			<Skeleton className="h-5 w-16 rounded-full" />
			<Skeleton className="h-5 w-20 rounded-full" />
		</div>
	);
}

function ThreadTagsList({
	appliedTagIds,
	availableTags,
}: {
	appliedTagIds: bigint[];
	availableTags: ForumTag[];
}) {
	if (appliedTagIds.length === 0) {
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

export async function ThreadTags({ threadId, availableTags }: ThreadTagsProps) {
	if (availableTags.length === 0) {
		return null;
	}

	const appliedTagIds = await fetchThreadTags(threadId);

	if (appliedTagIds === null || appliedTagIds.length === 0) {
		return null;
	}

	return (
		<ThreadTagsList
			appliedTagIds={appliedTagIds}
			availableTags={availableTags}
		/>
	);
}
