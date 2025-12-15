import { decodeCursor } from "@packages/ui/utils/cursor";
import { getServerCustomUrl } from "@packages/ui/utils/server";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Option } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
	ChannelPageLoader,
	fetchChannelPageHeaderData,
	generateChannelPageMetadata,
} from "../../../../../components/channel-page-loader";

type Props = {
	params: Promise<{ serverId: string; channelId: string }>;
	searchParams: Promise<{ cursor?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;

	const parsedServerId = parseSnowflakeId(params.serverId);
	const parsedChannelId = parseSnowflakeId(params.channelId);
	if (Option.isNone(parsedServerId) || Option.isNone(parsedChannelId)) {
		return {};
	}
	if (parsedServerId.value.wasCleaned || parsedChannelId.value.wasCleaned) {
		redirect(
			`/c/${parsedServerId.value.cleaned}/${parsedChannelId.value.cleaned}`,
		);
	}

	const headerData = await fetchChannelPageHeaderData(
		parsedServerId.value.id,
		parsedChannelId.value.id,
	);

	const basePath = `/c/${parsedServerId.value.cleaned}/${parsedChannelId.value.cleaned}`;
	return generateChannelPageMetadata(headerData, basePath);
}

export default async function ChannelPage(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const encodedCursor = searchParams?.cursor;
	const cursor = encodedCursor ? decodeCursor(encodedCursor) : undefined;

	const parsedServerId = parseSnowflakeId(params.serverId);
	const parsedChannelId = parseSnowflakeId(params.channelId);
	if (Option.isNone(parsedServerId) || Option.isNone(parsedChannelId)) {
		return notFound();
	}
	if (parsedServerId.value.wasCleaned || parsedChannelId.value.wasCleaned) {
		redirect(
			`/c/${parsedServerId.value.cleaned}/${parsedChannelId.value.cleaned}`,
		);
	}

	const headerData = await fetchChannelPageHeaderData(
		parsedServerId.value.id,
		parsedChannelId.value.id,
	);

	if (headerData?.server.customDomain) {
		const customUrl = getServerCustomUrl(
			headerData.server,
			`/c/${parsedServerId.value.cleaned}/${parsedChannelId.value.cleaned}`,
		);
		if (customUrl) {
			return redirect(customUrl);
		}
	}

	return <ChannelPageLoader headerData={headerData} cursor={cursor} />;
}
