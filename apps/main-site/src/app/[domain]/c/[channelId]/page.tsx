import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
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
	searchParams: Promise<{ cursor?: string }>;
};

async function getTenantData(domain: string) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		return tenant;
	}).pipe(runtime.runPromise);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const domain = decodeURIComponent(params.domain);
	const cursor = searchParams?.cursor ?? null;

	const tenantData = await getTenantData(domain);

	if (!tenantData?.server) {
		return {};
	}

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* database.private.channels.getChannelPageHeaderData({
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
			images: [`/og/community?id=${server.discordId.toString()}&tenant=true`],
			title: `#${selectedChannel.name} - ${server.name}`,
			description,
		},
		alternates: {
			canonical: `/c/${params.channelId}`,
		},
		robots: cursor ? "noindex, follow" : "index, follow",
	};
}

export default async function TenantChannelPage(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const domain = decodeURIComponent(params.domain);
	const encodedCursor = searchParams?.cursor;
	const cursor = encodedCursor ? decodeCursor(encodedCursor) : undefined;

	const tenantData = await getTenantData(domain);

	if (!tenantData?.server) {
		return notFound();
	}

	const headerData = await fetchChannelPageHeaderData(
		tenantData.server.discordId,
		BigInt(params.channelId),
	);

	return <ChannelPageLoader headerData={headerData} cursor={cursor} />;
}
