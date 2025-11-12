"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import {
	DashboardNavbar,
	type ServerSelectServer,
} from "@packages/ui/components/navbar";
import { useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import { authClient } from "../../lib/auth-client";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();

	// Extract serverId from pathname if we're on a server-specific route
	// Pathname will be like "/dashboard/[serverId]" or "/dashboard/[serverId]/channels" etc.
	const serverIdMatch = pathname?.match(/^\/dashboard\/([^/]+)/);
	const serverId = serverIdMatch
		? (serverIdMatch[1] as Id<"servers">)
		: undefined;

	// Only show server select on server-specific routes (not on /dashboard or /dashboard/onboarding)
	const shouldShowServerSelect = serverId !== undefined;

	// Fetch servers for dropdown using reactive query based on user server settings
	const servers = useQuery(
		api.public.dashboard_queries.getUserServersForDropdown,
		isSessionPending || !session?.user ? "skip" : {},
	);

	const serversForDropdown: ServerSelectServer[] =
		servers?.map((server) => ({
			id: server.aoServerId ? String(server.aoServerId) : server.discordId,
			name: server.name,
			icon: server.icon,
			hasBot: server.hasBot,
			discordId: server.discordId, // Preserve Discord ID for icon fetching
		})) ?? [];

	const serverSelectProps =
		shouldShowServerSelect && serversForDropdown.length > 0
			? {
					currentServerId: serverId,
					servers: serversForDropdown,
					getServerHref: (id: string) => `/dashboard/${id}`,
					addNewHref: "/dashboard/onboarding",
					isLoading: isSessionPending || servers === undefined,
				}
			: undefined;

	const userSectionProps = session?.user
		? {
				user: {
					name: session.user.name ?? null,
					image: session.user.image ?? null,
					email: session.user.email ?? null,
				},
			}
		: {
				signInHref: "/api/auth/signin",
			};

	return (
		<DashboardNavbar
			serverSelect={serverSelectProps}
			userSection={userSectionProps}
			homeHref="/dashboard"
		>
			{children}
		</DashboardNavbar>
	);
}
