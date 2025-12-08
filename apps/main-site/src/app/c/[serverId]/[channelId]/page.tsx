import {
	ChannelPageLoader,
	fetchChannelPageHeaderData,
} from "../../../../components/channel-page-loader";

type Props = {
	params: Promise<{ serverId: string; channelId: string }>;
};

export default async function ChannelPage(props: Props) {
	const params = await props.params;

	const headerData = await fetchChannelPageHeaderData(
		BigInt(params.serverId),
		BigInt(params.channelId),
	);

	return <ChannelPageLoader headerData={headerData} />;
}
