"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import {
	DashboardNavbar,
	DashboardSidebar,
	type ServerSelectServer,
} from "@packages/ui/components/navbar";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { useParams } from "next/navigation";
import { authClient } from "../../../lib/auth-client";

export default function DashboardServerLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const params = useParams();
	const serverId = params.serverId as Id<"servers"> | undefined;

	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const getUserServers = useAction(api.dashboard.getUserServers);

	// Fetch servers for dropdown
	const { data: servers } = useReactQuery({
		queryKey: ["dashboard-servers"],
		queryFn: async () => {
			if (!session?.user) {
				throw new Error("Not authenticated");
			}
			return await getUserServers({});
		},
		enabled: !isSessionPending && !!session?.user,
	});

	const serversForDropdown: ServerSelectServer[] =
		servers?.map((server) => ({
			id: server.aoServerId ? String(server.aoServerId) : server.discordId,
			name: server.name,
			icon: server.icon,
			hasBot: server.hasBot,
			discordId: server.discordId, // Preserve Discord ID for icon fetching
		})) ?? [];

	const serverSelectProps = serverId
		? {
				currentServerId: serverId,
				servers: serversForDropdown,
				getServerHref: (id: string) => `/dashboard/${id}`,
				addNewHref: "/onboarding",
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
			<DashboardSidebar>{children}</DashboardSidebar>
		</DashboardNavbar>
	);
}
