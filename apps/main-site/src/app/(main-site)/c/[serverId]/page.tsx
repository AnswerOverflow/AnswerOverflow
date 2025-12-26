import { ServerIcon } from "@packages/ui/components/server-icon";
import { getServerCustomUrl } from "@packages/ui/utils/server";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Option } from "effect";
import { Hash } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
	fetchServerPageHeaderData,
	generateServerPageMetadata,
	ServerPageLoader,
} from "../../../../components/channel-page-loader";

type Props = {
	params: Promise<{ serverId: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;

	const parsed = parseSnowflakeId(params.serverId);
	if (Option.isNone(parsed)) {
		return {};
	}
	if (parsed.value.wasCleaned) {
		redirect(`/c/${parsed.value.cleaned}`);
	}

	const headerData = await fetchServerPageHeaderData(parsed.value.id);

	const basePath = `/c/${parsed.value.cleaned}`;
	return generateServerPageMetadata(headerData, basePath);
}

export default async function ServerPage(props: Props) {
	const params = await props.params;

	const parsed = parseSnowflakeId(params.serverId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/c/${parsed.value.cleaned}`);
	}

	const headerData = await fetchServerPageHeaderData(parsed.value.id);

	if (!headerData) {
		return notFound();
	}

	const { server, channels } = headerData;

	if (server.customDomain) {
		const customUrl = getServerCustomUrl(server, `/c/${parsed.value.cleaned}`);
		if (customUrl) {
			return redirect(customUrl);
		}
	}

	if (channels.length === 0) {
		const description =
			server.description ??
			`Explore the ${server.name} community Discord server on the web. Search and browse discussions, find answers, and join the conversation.`;

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
											{server.name} Discord Server
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
