import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { runtime } from "../../../../lib/runtime";
import { TenantUserPageClient } from "./tenant-user-page-client";

type Props = {
	params: Promise<{ domain: string; userId: string }>;
};

export default async function TenantUserPage(props: Props) {
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
		const userData = yield* database.private.discord_accounts.getUserPageData({
			userId: BigInt(params.userId),
			serverId: tenant.server.discordId,
			limit: 10,
		});
		return [tenant, userData] as const;
	}).pipe(runtime.runPromise);

	if (!tenantData?.server || !pageData) {
		return notFound();
	}

	return (
		<TenantUserPageClient
			user={pageData.user}
			servers={pageData.servers}
			posts={pageData.posts}
			userId={params.userId}
			serverId={tenantData.server.discordId.toString()}
		/>
	);
}
