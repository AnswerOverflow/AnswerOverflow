import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
import { cacheLife, cacheTag } from "next/cache";
import { runtime } from "../lib/runtime";

export type UserPageHeaderData = NonNullable<
	FunctionReturnType<typeof api.public.discord_accounts.getUserPageHeaderData>
>;

export type UserPosts = FunctionReturnType<
	typeof api.public.discord_accounts.getUserPosts
>;

export async function fetchUserPageHeaderData(
	userId: bigint,
): Promise<UserPageHeaderData | null> {
	"use cache";
	cacheLife("minutes");
	cacheTag("user-header", userId.toString());

	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.discord_accounts.getUserPageHeaderData({
			userId,
		});
	}).pipe(runtime.runPromise);
}

export { UserPageClient } from "./user-page-client";
