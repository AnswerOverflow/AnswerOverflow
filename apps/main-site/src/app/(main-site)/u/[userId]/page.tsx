import { Skeleton } from "@packages/ui/components/skeleton";
import { ThreadCardSkeleton } from "@packages/ui/components/thread-card";
import { makeUserIconLink } from "@packages/ui/utils/discord-avatar";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Option } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
	fetchUserPageHeaderData,
	UserPageClient,
} from "../../../../components/user-page-loader";

export function generateStaticParams() {
	return [{ userId: "placeholder" }];
}

type Props = {
	params: Promise<{ userId: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;

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
		robots: { index: false },
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
		<div className="flex flex-col gap-4">
			<div className="flex flex-row items-center gap-4">
				<Skeleton className="h-16 w-16 rounded-full" />
				<Skeleton className="h-10 w-48" />
			</div>
			<div className="space-y-4">
				{Array.from({ length: 5 }).map((_, i) => (
					<ThreadCardSkeleton key={`skeleton-${i}`} />
				))}
			</div>
		</div>
	);
}

async function UserPageContent(props: { userId: string }) {
	const parsed = parseSnowflakeId(props.userId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/u/${parsed.value.cleaned}`);
	}

	return (
		<UserPageClient
			userId={parsed.value.cleaned}
			basePath={`/u/${parsed.value.cleaned}`}
			serverFilterLabel="Explore posts from servers"
		/>
	);
}

export default async function UserPage(props: Props) {
	const params = await props.params;

	return (
		<Suspense fallback={<UserPageSkeleton />}>
			<UserPageContent userId={params.userId} />
		</Suspense>
	);
}
