import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	ChannelPageLoader,
	fetchChannelPageHeaderData,
	generateChannelPageMetadata,
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

	const headerData = await fetchChannelPageHeaderData(
		tenantData.server.discordId,
		BigInt(params.channelId),
	);

	const basePath = `/c/${params.channelId}`;
	return generateChannelPageMetadata(headerData, basePath, cursor, true);
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
