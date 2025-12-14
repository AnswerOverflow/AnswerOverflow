import { Database } from "@packages/database/database";
import { Button } from "@packages/ui/components/button";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { Effect } from "effect";
import { Hash, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	fetchServerPageHeaderData,
	generateServerPageMetadata,
	ServerPageLoader,
} from "../../components/channel-page-loader";
import { runtime } from "../../lib/runtime";

type Props = {
	params: Promise<{ domain: string }>;
};

async function getTenantData(domain: string) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		return tenant;
	}).pipe(runtime.runPromise);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await getTenantData(domain);
	if (!tenantData?.server) {
		return {};
	}

	const headerData = await fetchServerPageHeaderData(
		tenantData.server.discordId,
	);

	const tenant = {
		customDomain: tenantData.preferences?.customDomain,
		subpath: tenantData.preferences?.subpath,
	};

	return generateServerPageMetadata(headerData, "/", tenant);
}

export default async function DomainPage(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await getTenantData(domain);
	if (!tenantData?.server) {
		return notFound();
	}

	const headerData = await fetchServerPageHeaderData(
		tenantData.server.discordId,
	);

	if (!headerData || headerData.channels.length === 0) {
		const server = headerData?.server ?? {
			discordId: tenantData.server.discordId,
			name: tenantData.server.name,
			icon: tenantData.server.icon,
			description: tenantData.server.description,
		};
		const inviteUrl = `https://discord.com/servers/${server.discordId}`;
		const description =
			server.description ??
			`Browse and search through archived Discord discussions from ${server.name}`;

		return (
			<div className="min-h-screen bg-background">
				<div className="border-b">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
						<div className="flex items-start gap-4">
							<ServerIcon
								server={{
									discordId: server.discordId,
									name: server.name,
									icon: server.icon ?? "",
								}}
								size={64}
								className="shrink-0"
							/>
							<div className="flex-1 min-w-0">
								<div className="flex items-start gap-4">
									<div className="flex-1 min-w-0">
										<h1 className="text-xl sm:text-2xl font-semibold text-foreground">
											{server.name}
										</h1>
										<p className="text-muted-foreground text-sm mt-1 line-clamp-2">
											{description}
										</p>
									</div>
									<Button
										variant="secondary"
										size="sm"
										asChild
										className="shrink-0 font-medium"
									>
										<a
											href={inviteUrl}
											target="_blank"
											rel="noopener noreferrer"
										>
											Join Discord
										</a>
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
					<div className="flex flex-col items-center justify-center text-center">
						<div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
							<Hash className="size-8 text-muted-foreground" />
						</div>
						<h2 className="text-xl font-semibold text-foreground mb-2">
							No channels indexed yet
						</h2>
						<p className="text-muted-foreground max-w-md mb-6">
							This community hasn't set up any channels for indexing. Join the
							Discord server to participate in discussions!
						</p>
						<Button variant="secondary" asChild className="font-medium">
							<a href={inviteUrl} target="_blank" rel="noopener noreferrer">
								<Users className="size-4 mr-2" />
								Join {server.name}
							</a>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return <ServerPageLoader headerData={headerData} />;
}
