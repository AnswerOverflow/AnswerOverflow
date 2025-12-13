import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { makeUserIconLink } from "@packages/ui/utils/discord-avatar";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	fetchUserPageHeaderData,
	UserPageLoader,
} from "../../../../components/user-page-loader";
import { runtime } from "../../../../lib/runtime";

type Props = {
	params: Promise<{ domain: string; userId: string }>;
	searchParams: Promise<{ cursor?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.servers.getServerByDomain({ domain });
	}).pipe(runtime.runPromise);

	const headerData = await fetchUserPageHeaderData(BigInt(params.userId));
	const userName = headerData?.user.name ?? "User";
	const serverName = tenantData?.server?.name ?? "this community";
	const userAvatar = headerData?.user
		? makeUserIconLink(
				{
					id: headerData.user.id,
					avatar: headerData.user.avatar,
				},
				256,
			)
		: null;

	const title = `${userName} Posts - ${serverName}`;
	const description = `See posts from ${userName} in the ${serverName} Discord`;

	return {
		title,
		description,
		alternates: {
			canonical: `/u/${params.userId}`,
		},
		robots: cursor ? "noindex, follow" : { index: false },
		openGraph: {
			title,
			description,
			...(userAvatar && { images: [userAvatar] }),
		},
		twitter: {
			card: "summary",
			title,
			description,
			...(userAvatar && { images: [userAvatar] }),
		},
	};
}

export default async function TenantUserPage(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.servers.getServerByDomain({ domain });
	}).pipe(runtime.runPromise);

	if (!tenantData?.server) {
		return notFound();
	}

	const headerData = await fetchUserPageHeaderData(BigInt(params.userId));

	if (!headerData) {
		return notFound();
	}

	const cursor = searchParams.cursor
		? decodeCursor(searchParams.cursor)
		: undefined;

	return (
		<UserPageLoader
			headerData={headerData}
			userId={params.userId}
			serverId={tenantData.server.discordId.toString()}
			basePath={`/u/${params.userId}`}
			serverFilterLabel="Explore posts from servers"
			cursor={cursor}
		/>
	);
}
