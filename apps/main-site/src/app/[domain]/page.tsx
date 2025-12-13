import { Database } from "@packages/database/database";
import { getTenantCanonicalUrl } from "@packages/ui/utils/links";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	ChannelPageLoader,
	fetchChannelPageHeaderData,
} from "../../components/channel-page-loader";
import { runtime } from "../../lib/runtime";

type Props = {
	params: Promise<{ domain: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		return tenant;
	}).pipe(runtime.runPromise);

	if (!tenantData?.server) {
		return {};
	}

	const serverData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData =
			yield* database.private.servers.getServerByDiscordIdWithChannels({
				discordId: tenantData.server.discordId,
			});
		return liveData;
	}).pipe(runtime.runPromise);

	if (!serverData) {
		return {};
	}

	const { server, channels } = serverData;
	const description =
		server.description ??
		`Browse ${channels.length} indexed channels from the ${server.name} Discord community`;

	const ogImage = `/og/community?id=${server.discordId.toString()}&tenant=true`;

	const tenant = {
		customDomain: tenantData.preferences?.customDomain,
		subpath: tenantData.preferences?.subpath,
	};
	const canonicalUrl = getTenantCanonicalUrl(tenant, "/");

	return {
		title: server.name,
		description,
		openGraph: {
			type: "website",
			siteName: server.name,
			images: [ogImage],
			title: server.name,
			description,
		},
		twitter: {
			card: "summary_large_image",
			title: server.name,
			description,
			images: [ogImage],
		},
		alternates: {
			canonical: canonicalUrl,
		},
		robots: "index, follow",
	};
}

export default async function DomainPage(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		return tenant;
	}).pipe(runtime.runPromise);

	if (!tenantData?.server) {
		return notFound();
	}

	const serverData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData =
			yield* database.private.servers.getServerByDiscordIdWithChannels({
				discordId: tenantData.server.discordId,
			});
		return liveData;
	}).pipe(runtime.runPromise);

	if (!serverData) {
		return notFound();
	}

	const { server, channels } = serverData;

	if (channels.length === 0) {
		return (
			<div className="min-h-screen bg-background">
				<div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
					<div className="mb-8 pb-6 border-b border-border">
						<div className="flex items-center gap-4">
							{server.icon && (
								<img
									src={`https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.webp?size=64`}
									alt={server.name}
									className="w-16 h-16 rounded-full"
								/>
							)}
							<div>
								<h1 className="text-3xl font-bold text-foreground">
									{server.name}
								</h1>
								{server.description && (
									<p className="text-muted-foreground mt-1">
										{server.description}
									</p>
								)}
							</div>
						</div>
					</div>
					<div className="text-center py-12 text-muted-foreground">
						No channels available
					</div>
				</div>
			</div>
		);
	}

	const defaultChannel = channels[0];
	if (!defaultChannel) {
		return notFound();
	}

	const headerData = await fetchChannelPageHeaderData(
		tenantData.server.discordId,
		defaultChannel.id,
	);

	return <ChannelPageLoader headerData={headerData} />;
}
