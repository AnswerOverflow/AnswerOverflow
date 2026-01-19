"use client";

import { api } from "@packages/database/convex/_generated/api";
import {
	ServerCard,
	ServerCardSkeleton,
} from "@packages/ui/components/server-card";
import { useQuery } from "convex/react";
import { useMemo } from "react";

export type InlineServerCardProps = {
	id: string;
};

function parseBigIntSafe(value: string): bigint | null {
	try {
		return BigInt(value);
	} catch {
		return null;
	}
}

export function InlineServerCard({ id }: InlineServerCardProps) {
	const discordId = useMemo(() => parseBigIntSafe(id), [id]);

	const serverData = useQuery(
		api.public.servers.getServerByDiscordIdWithChannels,
		discordId ? { discordId } : "skip",
	);

	if (!discordId) {
		return (
			<span className="block rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
				Invalid server ID
			</span>
		);
	}

	if (serverData === undefined) {
		return (
			<span className="block">
				<ServerCardSkeleton />
			</span>
		);
	}

	if (serverData === null) {
		return (
			<span className="block rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
				Server not found or is not indexed on Answer Overflow
			</span>
		);
	}

	return (
		<span className="my-3 block">
			<ServerCard server={serverData.server} />
		</span>
	);
}
