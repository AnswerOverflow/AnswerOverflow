"use client";

import { api } from "@packages/database/convex/_generated/api";
import { CustomDomain } from "@packages/ui/components/custom-domain";
import { useMutation } from "convex/react";
import { useAuthenticatedQuery } from "../../../../lib/use-authenticated-query";

export function CustomDomainConfigurator({ serverId }: { serverId: string }) {
	const dashboardData = useAuthenticatedQuery(
		api.authenticated.dashboard_queries.getDashboardData,
		{
			serverId: BigInt(serverId),
		},
	);

	const updateCustomDomain = useMutation(
		api.authenticated.dashboard_mutations.updateCustomDomain,
	);

	const currentDomain = dashboardData?.server.customDomain ?? undefined;

	const handleUpdateDomain = async (domain: string | null) => {
		await updateCustomDomain({
			serverId: BigInt(serverId),
			customDomain: domain,
		});
	};

	return (
		<CustomDomain
			defaultDomain={currentDomain}
			addDomainAction={api.authenticated.vercel_domains.addDomain}
			getDomainStatusAction={api.authenticated.vercel_domains.getDomainStatus}
			onDomainUpdate={handleUpdateDomain}
		/>
	);
}
