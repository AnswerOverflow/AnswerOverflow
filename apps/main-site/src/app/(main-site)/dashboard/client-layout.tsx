"use client";

import { api } from "@packages/database/convex/_generated/api";
import { SessionRecording } from "@packages/ui/analytics/client";
import { useSession } from "@packages/ui/components/convex-client-provider";
import {
	DashboardNavbar,
	type ServerSelectServer,
} from "@packages/ui/components/navbar";
import { usePathname } from "next/navigation";
import { useAuthenticatedQuery } from "../../../lib/use-authenticated-query";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const { data: session, isPending } = useSession({ allowAnonymous: false });

	const isDashboardRoot = pathname === "/dashboard";
	const serverIdMatch = pathname?.match(/^\/dashboard\/([^/]+)/);
	const serverId = serverIdMatch ? (serverIdMatch[1] as string) : undefined;

	const shouldShowServerSelect = serverId !== undefined;

	const servers = useAuthenticatedQuery(
		api.authenticated.dashboard_queries.getUserServersForDropdown,
		{},
	);

	const serversForDropdown: ServerSelectServer[] =
		servers?.map((server) => ({
			id: server.discordId.toString(),
			name: server.name,
			icon: server.icon,
			hasBot: server.hasBot,
			discordId: server.discordId,
		})) ?? [];

	const serverSelectProps =
		shouldShowServerSelect && serversForDropdown.length > 0
			? {
					currentServerId: serverId,
					servers: serversForDropdown,
					getServerHref: (id: string) => `/dashboard/${id}`,
					addNewHref: "/dashboard",
					isLoading: servers === undefined,
				}
			: undefined;

	const isSignedOut = !isPending && !session?.user;
	const hideNavbar = isDashboardRoot && isSignedOut;

	if (hideNavbar) {
		return (
			<>
				<SessionRecording />
				{children}
			</>
		);
	}

	return (
		<DashboardNavbar serverSelect={serverSelectProps}>
			<SessionRecording />
			{children}
		</DashboardNavbar>
	);
}
