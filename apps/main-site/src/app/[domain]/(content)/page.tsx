import { ServerIcon } from "@packages/ui/components/server-icon";
import { Hash } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	fetchServerPageHeaderData,
	generateServerPageMetadata,
	ServerPageLoader,
} from "../../../components/channel-page-loader";
import { getTenantData } from "../../../lib/tenant";

type Props = {
	params: Promise<{ domain: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const data = await getTenantData(domain);
	if (!data) {
		return {};
	}
	const { tenant } = data;

	const headerData = await fetchServerPageHeaderData(tenant.discordId);

	return generateServerPageMetadata(headerData, "/", tenant);
}

export default async function DomainPage(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const data = await getTenantData(domain);
	if (!data) {
		return notFound();
	}
	const { tenant } = data;
	if (!tenant) {
		return notFound();
	}

	const headerData = await fetchServerPageHeaderData(tenant.discordId);

	if (!headerData || headerData.channels.length === 0) {
		const description = tenant.description;

		return (
			<div className="min-h-screen bg-background">
				<div className="border-b">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
						<div className="flex items-start gap-4">
							<ServerIcon
								server={{
									discordId: tenant.discordId,
									name: tenant.name,
									icon: tenant.icon ?? "",
								}}
								size={64}
								className="shrink-0"
							/>
							<div className="flex-1 min-w-0">
								<div className="flex items-start gap-4">
									<div className="flex-1 min-w-0">
										<h1 className="text-xl sm:text-2xl font-semibold text-foreground">
											{tenant.name}
										</h1>
										<p className="text-muted-foreground text-sm mt-1 line-clamp-2">
											{description}
										</p>
									</div>
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
					</div>
				</div>
			</div>
		);
	}

	return <ServerPageLoader headerData={headerData} />;
}
