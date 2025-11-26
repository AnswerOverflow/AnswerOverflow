import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { runtime } from "../../../lib/runtime";
import { UserPageClient } from "./user-page-client";

type Props = {
	params: Promise<{ userId: string }>;
	searchParams: Promise<{ s?: string }>;
};

export default async function UserPage(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	const serverId = searchParams.s ? BigInt(searchParams.s) : undefined;

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* database.private.discord_accounts.getUserPageData({
			userId: BigInt(params.userId),
			serverId,
			limit: 10,
		});
		return liveData;
	}).pipe(runtime.runPromise);

	if (!pageData) {
		return notFound();
	}

	return (
		<UserPageClient
			user={pageData.user}
			servers={pageData.servers}
			posts={pageData.posts}
			userId={params.userId}
			serverId={searchParams.s}
		/>
	);
}
