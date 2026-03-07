"use client";

import { api } from "@packages/database/convex/_generated/api";
import { SessionRecording } from "@packages/ui/analytics/client";
import { useSession } from "@packages/ui/components/convex-client-provider";
import {
	DashboardNavbar,
	type ServerSelectServer,
} from "@packages/ui/components/navbar";
import { Spinner } from "@packages/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { usePathname } from "next/navigation";

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
	const getUserServers = useAction(api.authenticated.dashboard.getUserServers);

	const shouldShowServerSelect = serverId !== undefined;
	const shouldLoadServerList =
		serverId !== undefined && !isPending && !!session?.user;

	const {
		data: servers,
		isLoading: isLoadingServers,
		isError: hasServerListError,
	} = useQuery({
		queryKey: ["dashboard-servers"],
		queryFn: async () => {
			if (!session?.user) {
				throw new Error("Not authenticated");
			}
			return await getUserServers({});
		},
		enabled: shouldLoadServerList,
	});

	const serversForDropdown: ServerSelectServer[] =
		servers
			?.filter((server) => server.hasBot)
			.map((server) => ({
				id: server.discordId.toString(),
				name: server.name,
				icon: server.icon,
				hasBot: server.hasBot,
				discordId: BigInt(server.discordId),
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

	if (shouldLoadServerList && isLoadingServers && !hasServerListError) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Spinner />
			</div>
		);
	}

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
