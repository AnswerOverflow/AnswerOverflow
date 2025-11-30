"use client";

import { api } from "@packages/database/convex/_generated/api";
import { CustomDomain } from "@packages/ui/components/custom-domain";
import { useAuthenticatedQuery } from "../../../../lib/use-authenticated-query";

export function CustomDomainConfigurator({ serverId }: { serverId: string }) {
	const dashboardData = useAuthenticatedQuery(
		api.authenticated.dashboard_queries.getDashboardData,
		{
			serverId: BigInt(serverId),
		},
	);

	const currentDomain = dashboardData?.server.customDomain ?? undefined;

	return (
		<CustomDomain
			defaultDomain={currentDomain}
			addDomainAction={api.authenticated.vercel_domains.addDomain}
			getDomainStatusAction={api.authenticated.vercel_domains.getDomainStatus}
		/>
	);
}
