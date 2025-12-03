import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { runtime } from "../../../../lib/runtime";
import { UserCommentsPageClient } from "./user-comments-client";

type Props = {
	params: Promise<{ userId: string }>;
	searchParams: Promise<{ s?: string }>;
};

export default async function UserCommentsPage(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* database.private.discord_accounts.getUserPageData({
			userId: BigInt(params.userId),
			serverId: searchParams.s ? BigInt(searchParams.s) : undefined,
			limit: 10,
		});
		return liveData;
	}).pipe(runtime.runPromise);

	if (!pageData) {
		return notFound();
	}

	return (
		<UserCommentsPageClient
			user={pageData.user}
			servers={pageData.servers}
			comments={pageData.comments}
			userId={params.userId}
			serverId={searchParams.s}
		/>
	);
}
