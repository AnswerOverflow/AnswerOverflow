import { Database } from "@packages/database/database";
import { Providers } from "@packages/ui/components/providers";
import type { Tenant } from "@packages/ui/components/tenant-context";
import {
	getTenantCanonicalUrl,
	normalizeSubpath,
} from "@packages/ui/utils/links";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DomainNavbarFooterWrapper } from "../../components/domain-navbar-footer-wrapper";
import { runtime } from "../../lib/runtime";

type Props = {
	children: React.ReactNode;
	params: Promise<{ domain: string }>;
};

async function getTenantData(domain: string) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		if (!tenant?.server || !tenant?.preferences) {
			return null;
		}
		return {
			...tenant.server,
			...tenant.preferences,
		};
	}).pipe(runtime.runPromise);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);
	const tenantData = await getTenantData(domain);

	if (!tenantData?.icon) {
		return {};
	}

	const iconUrl = `https://cdn.answeroverflow.com/${tenantData.discordId}/${tenantData.icon}/icon.png`;
	const description =
		tenantData.description ?? `Browse the ${tenantData.name} community`;
	return {
		title: `${tenantData.name} Community`,
		metadataBase: new URL(
			getTenantCanonicalUrl(
				{
					customDomain: tenantData.customDomain,
					subpath: tenantData.subpath,
				},
				"/",
			),
		),
		description,
		icons: {
			icon: iconUrl,
			shortcut: iconUrl,
			apple: iconUrl,
		},
		robots: {
			index: true,
			follow: true,
		},
		openGraph: {
			type: "website",
			title: `${tenantData.name} Community`,
			siteName: tenantData.name,
			description,
			images: [
				{
					url: getTenantCanonicalUrl(
						{
							customDomain: tenantData.customDomain,
							subpath: tenantData.subpath,
						},
						`/og/community?id=${tenantData.discordId.toString()}&tenant=true`,
					),
					width: 1200,
					height: 630,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: `${tenantData.name} Community`,
			description,
			images: [
				getTenantCanonicalUrl(
					{
						customDomain: tenantData.customDomain,
						subpath: tenantData.subpath,
					},
					`/og/community?id=${tenantData.discordId.toString()}&tenant=true`,
				),
			],
		},
	};
}

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

export default async function DomainLayout(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);
	const tenantData = await getTenantData(domain);

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
