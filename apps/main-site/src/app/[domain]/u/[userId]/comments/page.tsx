import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { runtime } from "../../../../../lib/runtime";
import { TenantUserCommentsPageClient } from "./tenant-user-comments-client";

type Props = {
	params: Promise<{ domain: string; userId: string }>;
};

export default async function TenantUserCommentsPage(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const [tenantData, pageData] = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		if (!tenant?.server) {
			return [null, null] as const;
		}
		const userData = yield* database.public.search.getUserPageData({
			userId: params.userId,
			serverId: tenant.server.discordId.toString(),
			limit: 10,
		});
		return [tenant, userData] as const;
	}).pipe(runtime.runPromise);

	if (!tenantData?.server || !pageData) {
		return notFound();
	}

	return (
		<TenantUserCommentsPageClient
			user={pageData.user}
			servers={pageData.servers}
			comments={pageData.comments}
			userId={params.userId}
			serverId={tenantData.server.discordId.toString()}
		/>
	);
}
