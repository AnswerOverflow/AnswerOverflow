"use client";

import { cn } from "../lib/utils";
import { getDate } from "../utils/snowflake";

function formatDiscordTimestamp(date: Date) {
	return date.toLocaleString("en-US", {
		month: "numeric",
		day: "numeric",
		year: "2-digit",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

export function MessageTimestamp(props: {
	snowflake: string;
	className?: string;
}) {
	return (
		<span
			suppressHydrationWarning
			className={cn("text-sm text-muted-foreground", props.className)}
		>
			{formatDiscordTimestamp(getDate(props.snowflake))}
		</span>
	);
}
