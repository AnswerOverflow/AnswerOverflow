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
			<div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
				Invalid server ID
			</div>
		);
	}

	if (serverData === undefined) {
		return <ServerCardSkeleton />;
	}

	if (serverData === null) {
		return (
			<div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
				Server not found or is not indexed on Answer Overflow
			</div>
		);
	}

	return (
		<div className="my-3">
			<ServerCard server={serverData.server} />
		</div>
	);
}
