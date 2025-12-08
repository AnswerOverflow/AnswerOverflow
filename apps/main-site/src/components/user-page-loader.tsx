import type { api } from "@packages/database/convex/_generated/api";
import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { Database } from "@packages/database/database";
import { ThreadCardSkeletonList } from "@packages/ui/components/thread-card";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
	EmptyState,
	InitialResults,
	UserPageLayout,
} from "../app/u/[userId]/components";
import { runtime } from "../lib/runtime";

export type UserPageHeaderData = NonNullable<
	FunctionReturnType<typeof api.private.discord_accounts.getUserPageHeaderData>
>;

export type UserPosts = FunctionReturnType<
	typeof api.private.discord_accounts.getUserPosts
>;

export type UserComments = FunctionReturnType<
	typeof api.private.discord_accounts.getUserComments
>;

export async function fetchUserPageHeaderData(
	userId: bigint,
): Promise<UserPageHeaderData | null> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.discord_accounts.getUserPageHeaderData({
			userId,
		});
	}).pipe(runtime.runPromise);
}

export async function fetchUserPosts(
	userId: bigint,
	serverId?: bigint,
): Promise<UserPosts> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.discord_accounts.getUserPosts({
			userId,
			serverId,
			limit: 10,
		});
	}).pipe(runtime.runPromise);
}

export async function fetchUserComments(
	userId: bigint,
	serverId?: bigint,
): Promise<UserComments> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.discord_accounts.getUserComments({
			userId,
			serverId,
			limit: 10,
		});
	}).pipe(runtime.runPromise);
}

async function PostsLoader(props: { userId: bigint; serverId?: bigint }) {
	const posts = await fetchUserPosts(props.userId, props.serverId);
	return <PostsContent posts={posts} />;
}

async function CommentsLoader(props: { userId: bigint; serverId?: bigint }) {
	const comments = await fetchUserComments(props.userId, props.serverId);
	return <CommentsContent comments={comments} />;
}

function PostsContent(props: { posts: SearchResult[] }) {
	if (props.posts.length === 0) {
		return <EmptyState message="No posts found" />;
	}
	return <InitialResults results={props.posts} />;
}

function CommentsContent(props: { comments: SearchResult[] }) {
	if (props.comments.length === 0) {
		return <EmptyState message="No comments found" />;
	}
	return <InitialResults results={props.comments} />;
}

export function UserContentSkeleton() {
	return <ThreadCardSkeletonList count={5} />;
}

export function UserPageLoader(props: {
	headerData: UserPageHeaderData | null;
	userId: string;
	serverId?: string;
	basePath: string;
	serverFilterLabel: string;
	variant: "posts" | "comments";
}) {
	const { headerData, userId, serverId, basePath, serverFilterLabel, variant } =
		props;

	if (!headerData) {
		return notFound();
	}

	const userIdBigInt = BigInt(userId);
	const serverIdBigInt = serverId ? BigInt(serverId) : undefined;

	return (
		<UserPageLayout
			user={headerData.user}
			servers={headerData.servers}
			userId={userId}
			serverId={serverId}
			basePath={basePath}
			serverFilterLabel={serverFilterLabel}
		>
			<Suspense fallback={<UserContentSkeleton />}>
				{variant === "posts" ? (
					<PostsLoader userId={userIdBigInt} serverId={serverIdBigInt} />
				) : (
					<CommentsLoader userId={userIdBigInt} serverId={serverIdBigInt} />
				)}
			</Suspense>
		</UserPageLayout>
	);
}
