import { Database, DatabaseLayer } from "@packages/database/database";
import type { Tenant } from "@packages/ui/components/tenant-context";
import { normalizeSubpath } from "@packages/ui/utils/links";
import { Effect } from "effect";

const subpathTenants = [
	{
		rewriteDomain: "migaku.com",
		subpath: "community",
	},
	{
		rewriteDomain: "rhys.ltd",
		subpath: "idk",
	},
	{
		rewriteDomain: "vapi.ai",
		subpath: "community",
	},
];

export default async function DomainPage(props: {
	children: React.ReactNode;
	params: Promise<{ domain: string }>;
}) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		return {
			...tenant?.server,
			...tenant?.preferences,
		};
	}).pipe(Effect.provide(DatabaseLayer), Effect.runPromise);

	const subpathTenant = subpathTenants.find(
		(tenant) => tenant.rewriteDomain === domain,
	);

	const tenant: Tenant = {
		customDomain: tenantData.customDomain,
		subpath: subpathTenant
			? normalizeSubpath(subpathTenant.subpath)
			: tenantData.subpath
				? normalizeSubpath(tenantData.subpath)
				: null,
		name: tenantData.name,
		icon: tenantData.icon,
		discordId: tenantData.discordId,
	};
	return <div>{tenant.name}</div>;
}
