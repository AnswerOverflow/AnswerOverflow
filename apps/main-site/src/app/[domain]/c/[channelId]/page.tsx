import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Effect, Option } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
	const domain = decodeURIComponent(params.domain);

	const parsedChannelId = parseSnowflakeId(params.channelId);
	if (Option.isNone(parsedChannelId)) {
		return {};
	}
	if (parsedChannelId.value.wasCleaned) {
		redirect(`/c/${parsedChannelId.value.cleaned}`);
	}

	const tenantData = await getTenantData(domain);

	if (!tenantData?.server) {
		return {};
	}

	const headerData = await fetchChannelPageHeaderData(
		tenantData.server.discordId,
		parsedChannelId.value.id,
	);

	const basePath = `/c/${parsedChannelId.value.cleaned}`;
	const tenant = {
		customDomain: tenantData.preferences?.customDomain,
		subpath: tenantData.preferences?.subpath,
	};
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

	const tenantData = await getTenantData(domain);

	if (!tenantData?.server) {
		return notFound();
	}

	const headerData = await fetchChannelPageHeaderData(
		tenantData.server.discordId,
		parsedChannelId.value.id,
	);

	return <ChannelPageLoader headerData={headerData} cursor={cursor} />;
}
