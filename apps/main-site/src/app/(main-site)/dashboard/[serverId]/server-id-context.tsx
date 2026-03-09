"use client";

import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Option as O } from "effect";
import { usePathname } from "next/navigation";

export const getDashboardServerIdFromPathname = (
	pathname: string | null,
): string | null => {
	const serverIdSegment = pathname?.match(/^\/dashboard\/([^/]+)/)?.[1];

	if (!serverIdSegment) {
		return null;
	}

	const parsedServerId = parseSnowflakeId(serverIdSegment.trim());

	if (O.isNone(parsedServerId)) {
		return null;
	}

	return parsedServerId.value.cleaned;
};

export function useDashboardServerId(): string {
	const pathname = usePathname();
	const serverId = getDashboardServerIdFromPathname(pathname);

	if (!serverId) {
		throw new Error(
			"useDashboardServerId could not determine a valid server ID from the URL",
		);
	}

	return serverId;
}
