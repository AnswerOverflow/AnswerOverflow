import type { Metadata } from "next";
import {
	ChannelPageLoader,
	fetchChannelPageData,
	generateChannelPageMetadata,
} from "../../../../components/channel-page-loader";

type Props = {
	params: Promise<{ serverId: string; channelId: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const pageData = await fetchChannelPageData(
		BigInt(params.serverId),
		BigInt(params.channelId),
	);
	return generateChannelPageMetadata(
		pageData,
		params.serverId,
		params.channelId,
	);
}

export default async function ChannelPage(props: Props) {
	const params = await props.params;
	const pageData = await fetchChannelPageData(
		BigInt(params.serverId),
		BigInt(params.channelId),
	);
	return <ChannelPageLoader pageData={pageData} />;
}
