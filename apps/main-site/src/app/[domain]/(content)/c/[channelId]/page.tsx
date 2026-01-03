import { decodeCursor } from "@packages/ui/utils/cursor";
import { getTenantCanonicalUrl } from "@packages/ui/utils/links";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Option } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
	ChannelPageLoader,
	fetchChannelPageHeaderData,
	generateChannelPageMetadata,
} from "../../../../../components/channel-page-loader";
import { getTenantData } from "../../../../../lib/tenant";

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

export default async function TenantChannelPage(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const domain = decodeURIComponent(params.domain);
	const encodedCursor = searchParams?.cursor;
	const cursor = encodedCursor ? decodeCursor(encodedCursor) : undefined;

	const parsedChannelId = parseSnowflakeId(params.channelId);
	if (Option.isNone(parsedChannelId)) {
		return notFound();
	}
	if (parsedChannelId.value.wasCleaned) {
		redirect(`/c/${parsedChannelId.value.cleaned}`);
	}

	const data = await getTenantData(domain);
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
