import { Providers } from "@packages/ui/components/providers";
import { getTenantCanonicalUrl } from "@packages/ui/utils/links";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DomainNavbarFooterWrapper } from "../../components/domain-navbar-footer-wrapper";
import { getTenantData } from "@/lib/tenant";

type Props = {
	children: React.ReactNode;
	params: Promise<{ domain: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);
	const data = await getTenantData(domain);

	if (!data?.tenant.icon) {
		return {};
	}

	const { tenant, description, iconUrl } = data;

	return {
		title: `${tenant.name} Community`,
		metadataBase: new URL(
			getTenantCanonicalUrl(
				{
					customDomain: tenant.customDomain,
					subpath: tenant.subpath,
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
			title: `${tenant.name} Community`,
			siteName: tenant.name ?? undefined,
			description,
			images: [
				{
					url: getTenantCanonicalUrl(
						{
							customDomain: tenant.customDomain,
							subpath: tenant.subpath,
						},
						`/og/community?id=${tenant.discordId?.toString()}&tenant=true`,
					),
					width: 1200,
					height: 630,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: `${tenant.name} Community`,
			description,
			images: [
				getTenantCanonicalUrl(
					{
						customDomain: tenant.customDomain,
						subpath: tenant.subpath,
					},
					`/og/community?id=${tenant.discordId?.toString()}&tenant=true`,
				),
			],
		},
	};
}

export default async function DomainLayout(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);
	const data = await getTenantData(domain);

	if (!data) {
		return notFound();
	}

	return (
		<Providers tenant={data.tenant}>
			<DomainNavbarFooterWrapper>{props.children}</DomainNavbarFooterWrapper>
		</Providers>
	);
}
