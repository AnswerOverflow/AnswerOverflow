"use client";

import { api } from "@packages/database/convex/_generated/api";
import {
	DashboardNavbar,
	type ServerSelectServer,
} from "@packages/ui/components/navbar";
import { useConvexAuth, useQuery } from "convex/react";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const { isLoading, isAuthenticated } = useConvexAuth();

	const isOnboardingPage = pathname === "/dashboard/onboarding";
	const serverIdMatch = pathname?.match(/^\/dashboard\/([^/]+)/);
	const serverId =
		serverIdMatch && !isOnboardingPage
			? (serverIdMatch[1] as string)
			: undefined;

	const shouldShowServerSelect = serverId !== undefined && !isOnboardingPage;

	const servers = useQuery(
		api.authenticated.dashboard_queries.getUserServersForDropdown,
		isLoading || !isAuthenticated ? "skip" : {},
	);

	const serversForDropdown: ServerSelectServer[] =
		servers?.map((server) => ({
			id: server.discordId,
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
					addNewHref: "/dashboard/onboarding",
					isLoading: isLoading || servers === undefined,
				}
			: undefined;

	return (
		<DashboardNavbar serverSelect={serverSelectProps} homeHref="/dashboard">
			{children}
		</DashboardNavbar>
	);
}
