"use client";

import { cn } from "../lib/utils";
import { getDate } from "../utils/snowflake";

function formatRelativeTime(date: Date) {
	const now = new Date();
	const diffInMilliseconds = date.getTime() - now.getTime();

	const daysDifference = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
	const hoursDifference =
		Math.floor(diffInMilliseconds / (1000 * 60 * 60)) % 24;

	const rtf = new Intl.RelativeTimeFormat("en", {
		style: "narrow",
		numeric: "auto",
	});

	if (daysDifference < -500) {
		return rtf.format(Math.floor(daysDifference / 365), "year");
	}
	if (daysDifference < -30) {
		return rtf.format(Math.floor(daysDifference / 30), "month");
	}
	if (daysDifference < -7) {
		return rtf.format(Math.floor(daysDifference / 7), "week");
	}
	if (daysDifference < -1) {
		return rtf.format(daysDifference, "day");
	}

	return rtf.format(hoursDifference, "hour");
}

export function TimeAgo(props: { snowflake: string; className?: string }) {
	return (
		<span
			suppressHydrationWarning
			className={cn("text-sm text-muted-foreground", props.className)}
		>
			{formatRelativeTime(getDate(props.snowflake))}
		</span>
	);
}
