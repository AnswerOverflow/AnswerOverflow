"use client";

import { api } from "@packages/database/convex/_generated/api";
import {
	ThreadCard,
	ThreadCardSkeleton,
} from "@packages/ui/components/thread-card";
import { useQuery } from "convex/react";
import { useMemo } from "react";

export type InlineThreadCardProps = {
	id: string;
	notFoundMessage?: string;
};

function parseBigIntSafe(value: string): bigint | null {
	try {
		return BigInt(value);
	} catch {
		return null;
	}
}

export function InlineThreadCard({
	id,
	notFoundMessage = "Thread not found or has been deleted",
}: InlineThreadCardProps) {
	const messageId = useMemo(() => parseBigIntSafe(id), [id]);

	const result = useQuery(
		api.public.messages.getMessageAsSearchResult,
		messageId ? { messageId } : "skip",
	);

	if (!messageId) {
		return (
			<div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
				Invalid message ID
			</div>
		);
	}

	if (result === undefined) {
		return <ThreadCardSkeleton />;
	}

	if (result === null) {
		return (
			<div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
				{notFoundMessage}
			</div>
		);
	}

	return (
		<div className="my-3">
			<ThreadCard result={result} />
		</div>
	);
}

export const InlineMessageCard = (
	props: Omit<InlineThreadCardProps, "notFoundMessage">,
) => (
	<InlineThreadCard
		{...props}
		notFoundMessage="Message not found or has been deleted"
	/>
);
