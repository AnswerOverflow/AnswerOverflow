import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import { ThreadCardSkeleton } from "@packages/ui/components/thread-card";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
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
			currentCursor={props.cursor}
			basePath={props.basePath}
		/>
	);
}

export function UserPageLoader(props: {
	headerData: UserPageHeaderData | null;
	userId: string;
	serverId?: string;
	basePath: string;
	serverFilterLabel: string;
	cursor?: string;
}) {
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
