import { Skeleton } from "@packages/ui/components/skeleton";
import { ThreadCardSkeleton } from "@packages/ui/components/thread-card";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { makeUserIconLink } from "@packages/ui/utils/discord-avatar";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Option } from "effect";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
	fetchUserPageHeaderData,
	UserPageLoader,
} from "../../../../components/user-page-loader";

type Props = {
	params: Promise<{ userId: string }>;
	searchParams: Promise<{ s?: string; cursor?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;

	const parsed = parseSnowflakeId(params.userId);
	if (Option.isNone(parsed)) {
		return {};
	}
	if (parsed.value.wasCleaned) {
		redirect(`/u/${parsed.value.cleaned}`);
	}

	const headerData = await fetchUserPageHeaderData(parsed.value.id);
	const userName = headerData?.user.name ?? "User";
	const userAvatar = headerData?.user
		? makeUserIconLink(
				{
					id: headerData.user.id,
					avatar: headerData.user.avatar,
				},
				256,
			)
		: null;

	const title = `${userName} Posts - Answer Overflow`;
	const description = `See posts from ${userName} on Answer Overflow`;

	return {
		title,
		description,
		alternates: {
			canonical: `/u/${parsed.value.cleaned}`,
		},
		robots: cursor ? "noindex, follow" : { index: false },
		openGraph: {
			title,
			description,
			...(userAvatar && { images: [userAvatar] }),
		},
		twitter: {
			card: "summary",
			title,
			description,
			...(userAvatar && { images: [userAvatar] }),
		},
	};
}

function UserPageSkeleton() {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex flex-col items-center gap-4 mb-8">
				<Skeleton className="h-24 w-24 rounded-full" />
				<Skeleton className="h-8 w-48" />
			</div>
			<div className="space-y-4">
				{Array.from({ length: 5 }).map((_, i) => (
					<ThreadCardSkeleton key={`skeleton-${i}`} />
				))}
			</div>
		</div>
	);
}

async function UserPageContent(props: {
	userId: string;
	serverId?: string;
	cursor?: string;
}) {
	"use cache";
	cacheLife("minutes");
	cacheTag("user-page", props.userId);

	const parsed = parseSnowflakeId(props.userId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/u/${parsed.value.cleaned}`);
	}

	const headerData = await fetchUserPageHeaderData(parsed.value.id);

	if (!headerData) {
		return notFound();
	}

	return (
		<UserPageLoader
			headerData={headerData}
			userId={parsed.value.cleaned}
			serverId={props.serverId}
			basePath={`/u/${parsed.value.cleaned}`}
			serverFilterLabel="Explore posts from servers"
			cursor={props.cursor}
		/>
	);
}

export default async function UserPage(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const cursor = searchParams.cursor
		? decodeCursor(searchParams.cursor)
		: undefined;

	return (
		<Suspense fallback={<UserPageSkeleton />}>
			<UserPageContent
				userId={params.userId}
				serverId={searchParams.s}
				cursor={cursor}
			/>
		</Suspense>
	);
}
