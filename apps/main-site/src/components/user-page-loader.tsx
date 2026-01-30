import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import { ThreadCardSkeleton } from "@packages/ui/components/thread-card";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
	UserPageLayout,
	UserPostsList,
} from "../app/(main-site)/u/[userId]/components";
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

export async function fetchUserPosts(
	userId: bigint,
	serverId?: bigint,
	cursor: string | null = null,
): Promise<UserPosts> {
	"use cache";
	cacheLife("minutes");
	cacheTag("user-posts", userId.toString(), serverId?.toString() ?? "all");

	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.discord_accounts.getUserPosts({
			userId,
			serverId,
			paginationOpts: { numItems: 20, cursor },
		});
	}).pipe(runtime.runPromise);
}

function UserContentSkeleton() {
	return (
		<div className="space-y-4">
			{Array.from({ length: 5 }).map((_, i) => (
				<ThreadCardSkeleton key={`skeleton-${i}`} />
			))}
		</div>
	);
}

async function PostsLoader(props: {
	userId: bigint;
	serverId?: string;
	cursor: string | null;
	basePath: string;
}) {
	"use cache";
	cacheLife("minutes");
	cacheTag("posts-loader", props.userId.toString(), props.serverId ?? "all");

	const serverIdBigInt = props.serverId ? BigInt(props.serverId) : undefined;
	const posts = await fetchUserPosts(
		props.userId,
		serverIdBigInt,
		props.cursor,
	);
	return (
		<UserPostsList
			userId={props.userId}
			serverId={props.serverId}
			initialData={posts}
			nextCursor={posts.isDone ? null : posts.continueCursor}
			basePath={props.basePath}
		/>
	);
}

export async function UserPageLoader(props: {
	headerData: UserPageHeaderData | null;
	userId: string;
	serverId?: string;
	basePath: string;
	serverFilterLabel: string;
	cursor?: string;
}) {
	"use cache";
	cacheLife("minutes");
	cacheTag("user-page-loader", props.userId, props.serverId ?? "all");

	const { headerData, userId, serverId, basePath, serverFilterLabel, cursor } =
		props;

	if (!headerData) {
		return notFound();
	}

	const userIdBigInt = BigInt(userId);

	return (
		<UserPageLayout
			user={headerData.user}
			servers={headerData.servers}
			serverId={serverId}
			basePath={basePath}
			serverFilterLabel={serverFilterLabel}
		>
			<Suspense fallback={<UserContentSkeleton />}>
				<PostsLoader
					userId={userIdBigInt}
					serverId={serverId}
					cursor={cursor ?? null}
					basePath={basePath}
				/>
			</Suspense>
		</UserPageLayout>
	);
}
