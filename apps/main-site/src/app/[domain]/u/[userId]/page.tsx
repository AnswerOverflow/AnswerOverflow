import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
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

	return {
		title: "User Posts",
		description: "See posts from this user",
		alternates: {
			canonical: `/u/${params.userId}`,
		},
		robots: cursor ? "noindex, follow" : { index: false },
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
