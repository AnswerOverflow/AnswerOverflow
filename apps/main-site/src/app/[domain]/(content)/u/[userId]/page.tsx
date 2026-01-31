import { Database } from "@packages/database/database";
import { Skeleton } from "@packages/ui/components/skeleton";
import { ThreadCardSkeleton } from "@packages/ui/components/thread-card";
import { makeUserIconLink } from "@packages/ui/utils/discord-avatar";
import { getTenantCanonicalUrl } from "@packages/ui/utils/links";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Effect, Option } from "effect";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
	fetchUserPageHeaderData,
	UserPageClient,
} from "../../../../../components/user-page-loader";
import { runtime } from "../../../../../lib/runtime";

export function generateStaticParams() {
	return [{ domain: "placeholder", userId: "placeholder" }];
}

async function fetchTenantData(domain: string) {
	"use cache";
	cacheLife("hours");
	cacheTag("tenant-user-page", domain);

	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.servers.getServerByDomain({ domain });
	}).pipe(runtime.runPromise);
}

type Props = {
	params: Promise<{ domain: string; userId: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const parsed = parseSnowflakeId(params.userId);
	if (Option.isNone(parsed)) {
		return {};
	}
	if (parsed.value.wasCleaned) {
		redirect(`/u/${parsed.value.cleaned}`);
	}

	const tenantData = await fetchTenantData(domain);

	const headerData = await fetchUserPageHeaderData(parsed.value.id);
	const userName = headerData?.user.name ?? "User";
	const serverName = tenantData?.server?.name ?? "this community";
	const userAvatar = headerData?.user
		? makeUserIconLink(
				{
					id: headerData.user.id,
					avatar: headerData.user.avatar,
				},
				256,
			)
		: null;

	const title = `${userName} Posts - ${serverName}`;
	const description = `See posts from ${userName} in the ${serverName} Discord`;

	const tenant = {
		customDomain: tenantData?.preferences?.customDomain,
		subpath: tenantData?.preferences?.subpath,
	};
	const canonicalUrl = getTenantCanonicalUrl(
		tenant,
		`/u/${parsed.value.cleaned}`,
	);

	return {
		title,
		description,
		alternates: {
			canonical: canonicalUrl,
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

async function TenantUserPageContent(props: {
	domain: string;
	userId: string;
}) {
	const parsed = parseSnowflakeId(props.userId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/u/${parsed.value.cleaned}`);
	}

	const tenantData = await fetchTenantData(props.domain);

	if (!tenantData?.server) {
		return notFound();
	}

	return (
		<UserPageClient
			userId={parsed.value.cleaned}
			serverId={tenantData.server.discordId.toString()}
			basePath={`/u/${parsed.value.cleaned}`}
			serverFilterLabel="Explore posts from servers"
		/>
	);
}

export default async function TenantUserPage(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	return (
		<Suspense fallback={<UserPageSkeleton />}>
			<TenantUserPageContent domain={domain} userId={params.userId} />
		</Suspense>
	);
}
