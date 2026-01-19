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
			<span className="block rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
				Invalid message ID
			</span>
		);
	}

	if (result === undefined) {
		return (
			<span className="block">
				<ThreadCardSkeleton />
			</span>
		);
	}

	if (result === null) {
		return (
			<span className="block rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
				{notFoundMessage}
			</span>
		);
	}

	return (
		<span className="my-3 block">
			<ThreadCard result={result} />
		</span>
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
