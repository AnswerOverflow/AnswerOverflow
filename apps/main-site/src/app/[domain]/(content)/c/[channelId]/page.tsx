import { ChannelThreadCardSkeleton } from "@packages/ui/components/thread-card";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { getTenantCanonicalUrl } from "@packages/ui/utils/links";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Option } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CommunityPageSkeleton } from "../../../../../components/channel-page-content";
import {
	ChannelPageLoader,
	fetchChannelPageHeaderData,
	generateChannelPageMetadata,
} from "../../../../../components/channel-page-loader";
import { getTenantData } from "../../../../../lib/tenant";

export function generateStaticParams() {
	return [{ domain: "placeholder", channelId: "placeholder" }];
}

type Props = {
	params: Promise<{ domain: string; channelId: string }>;
	searchParams: Promise<{ cursor?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const parsedChannelId = parseSnowflakeId(params.channelId);
	if (Option.isNone(parsedChannelId)) {
		return {};
	}
	if (parsedChannelId.value.wasCleaned) {
		redirect(`/c/${parsedChannelId.value.cleaned}`);
	}

	const data = await getTenantData(domain);
	if (!data) {
		return {};
	}
	const { tenant } = data;

	const headerData = await fetchChannelPageHeaderData(
		tenant.discordId,
		parsedChannelId.value.id,
	);

	const basePath = `/c/${parsedChannelId.value.cleaned}`;
	return generateChannelPageMetadata(headerData, basePath, tenant);
}

function TenantChannelPageSkeleton() {
	return (
		<CommunityPageSkeleton
			threadsSkeleton={
				<div className="space-y-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<ChannelThreadCardSkeleton key={`skeleton-${i}`} />
					))}
				</div>
			}
		/>
	);
}

async function TenantChannelPageContent(props: {
	domain: string;
	channelId: string;
	searchParams: Promise<{ cursor?: string }>;
}) {
	const params = await props.searchParams;
	const cursor = params.cursor ? decodeCursor(params.cursor) : undefined;

	const parsedChannelId = parseSnowflakeId(props.channelId);
	if (Option.isNone(parsedChannelId)) {
		return notFound();
	}
	if (parsedChannelId.value.wasCleaned) {
		redirect(`/c/${parsedChannelId.value.cleaned}`);
	}

	const data = await getTenantData(props.domain);
	if (!data) {
		return notFound();
	}
	const { tenant } = data;

	if (!tenant) {
		return notFound();
	}

	const headerData = await fetchChannelPageHeaderData(
		tenant.discordId,
		parsedChannelId.value.id,
	);

	if (tenant.discordId === parsedChannelId.value.id) {
		return redirect(getTenantCanonicalUrl(tenant, `/`));
	}

	return <ChannelPageLoader headerData={headerData} cursor={cursor} />;
}

export default async function TenantChannelPage(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	return (
		<Suspense fallback={<TenantChannelPageSkeleton />}>
			<TenantChannelPageContent
				domain={domain}
				channelId={params.channelId}
				searchParams={props.searchParams}
			/>
		</Suspense>
	);
}
