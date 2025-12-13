import { decodeCursor } from "@packages/ui/utils/cursor";
import { getServerCustomUrl } from "@packages/ui/utils/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
	ChannelPageLoader,
	fetchChannelPageHeaderData,
	generateChannelPageMetadata,
} from "../../../../components/channel-page-loader";

type Props = {
	params: Promise<{ serverId: string; channelId: string }>;
	searchParams: Promise<{ cursor?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const encodedCursor = searchParams?.cursor ?? null;

	const headerData = await fetchChannelPageHeaderData(
		BigInt(params.serverId),
		BigInt(params.channelId),
	);

	const basePath = `/c/${params.serverId}/${params.channelId}`;
	return generateChannelPageMetadata(headerData, basePath, encodedCursor);
}

export default async function ChannelPage(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const encodedCursor = searchParams?.cursor;
	const cursor = encodedCursor ? decodeCursor(encodedCursor) : undefined;

	const headerData = await fetchChannelPageHeaderData(
		BigInt(params.serverId),
		BigInt(params.channelId),
	);

	if (headerData?.server.customDomain) {
		const customUrl = getServerCustomUrl(
			headerData.server,
			`/c/${params.serverId}/${params.channelId}`,
		);
		if (customUrl) {
			return redirect(customUrl);
		}
	}

	return <ChannelPageLoader headerData={headerData} cursor={cursor} />;
}
