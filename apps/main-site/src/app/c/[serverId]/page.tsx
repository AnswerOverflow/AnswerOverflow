import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	ChannelPageLoader,
	EmptyServerPage,
	fetchChannelPageData,
	fetchServerWithChannels,
	generateServerPageMetadata,
} from "../../../components/channel-page-loader";

type Props = {
	params: Promise<{ serverId: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const serverData = await fetchServerWithChannels(BigInt(params.serverId));
	return generateServerPageMetadata(serverData, params.serverId);
}

export default async function ServerPage(props: Props) {
	const params = await props.params;
	const serverData = await fetchServerWithChannels(BigInt(params.serverId));

	if (!serverData || serverData?.server.kickedTime) {
		return notFound();
	}

	const { channels } = serverData;

	if (channels.length === 0) {
		return <EmptyServerPage serverData={serverData} />;
	}

	const defaultChannel = channels[0];
	if (!defaultChannel) {
		return notFound();
	}

	const pageData = await fetchChannelPageData(
		BigInt(params.serverId),
		defaultChannel.id,
	);

	return <ChannelPageLoader pageData={pageData} />;
}
