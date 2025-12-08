import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import {
	fetchUserPageHeaderData,
	UserPageLoader,
} from "../../../../../components/user-page-loader";
import { runtime } from "../../../../../lib/runtime";

type Props = {
	params: Promise<{ domain: string; userId: string }>;
};

export default async function TenantUserCommentsPage(props: Props) {
	const params = await props.params;
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

	return (
		<UserPageLoader
			headerData={headerData}
			userId={params.userId}
			serverId={tenantData.server.discordId.toString()}
			basePath={`/u/${params.userId}/comments`}
			serverFilterLabel="Explore comments from servers"
			variant="comments"
		/>
	);
}
