import { Database } from "@packages/database/database";
import { makeUserIconLink } from "@packages/ui/utils/discord-avatar";
import { getTenantCanonicalUrl } from "@packages/ui/utils/links";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Effect, Option } from "effect";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
	fetchUserPageHeaderData,
	UserPageClient,
} from "../../../../../components/user-page-loader";
import { runtime } from "../../../../../lib/runtime";

export async function generateStaticParams() {
	return [{ domain: "vapi.ai", userId: "placeholder" }];
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

export default async function TenantUserPage(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const parsed = parseSnowflakeId(params.userId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/u/${parsed.value.cleaned}`);
	}

	const tenantData = await fetchTenantData(domain);

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
