import { Database } from "@packages/database/database";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	ChannelPageLoader,
	fetchChannelPageHeaderData,
} from "../../../../components/channel-page-loader";
import { runtime } from "../../../../lib/runtime";

type Props = {
	params: Promise<{ domain: string; channelId: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		return tenant;
	}).pipe(runtime.runPromise);

	if (!tenantData?.server) {
		return {};
	}

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* database.private.channels.getChannelPageData({
			serverDiscordId: tenantData.server.discordId,
			channelDiscordId: BigInt(params.channelId),
		});
		return liveData;
	}).pipe(runtime.runPromise);

	if (!pageData) {
		return {};
	}

	const { server, selectedChannel } = pageData;
	const description =
		server.description ??
		`Browse threads from #${selectedChannel.name} in the ${server.name} Discord community`;

	return {
		title: `#${selectedChannel.name} - ${server.name}`,
		description,
		openGraph: {
			images: [`/og/community?id=${server.discordId.toString()}`],
			title: `#${selectedChannel.name} - ${server.name}`,
			description,
		},
		alternates: {
			canonical: `/c/${params.channelId}`,
		},
	};
}

export default async function TenantChannelPage(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		return tenant;
	}).pipe(runtime.runPromise);

	if (!tenantData?.server) {
		return notFound();
	}

	const headerData = await fetchChannelPageHeaderData(
		tenantData.server.discordId,
		BigInt(params.channelId),
	);

	return <ChannelPageLoader headerData={headerData} />;
}
