import { Database } from "@packages/database/database";
import { Providers } from "@packages/ui/components/providers";
import type { Tenant } from "@packages/ui/components/tenant-context";
import { normalizeSubpath } from "@packages/ui/utils/links";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { DomainNavbarFooterWrapper } from "../../components/domain-navbar-footer-wrapper";
import { runtime } from "../../lib/runtime";

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

export default async function DomainLayout(props: {
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
		if (!tenant?.server || !tenant?.preferences) {
			return null;
		}
		return {
			...tenant?.server,
			...tenant?.preferences,
		};
	}).pipe(runtime.runPromise);

	if (!tenantData) {
		return notFound();
	}

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

	return (
		<Providers tenant={tenant}>
			<DomainNavbarFooterWrapper>{props.children}</DomainNavbarFooterWrapper>
		</Providers>
	);
}
