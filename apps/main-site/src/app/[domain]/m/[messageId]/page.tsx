import { Database } from "@packages/database/database";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
	fetchMessagePageData,
	generateMessagePageMetadata,
} from "../../../../components/message-page-loader";
import { MessagePage } from "../../../../components/message-page";
import { runtime } from "../../../../lib/runtime";

type Props = {
	params: Promise<{ domain: string; messageId: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const pageData = await fetchMessagePageData(BigInt(params.messageId));
	return generateMessagePageMetadata(pageData, params.messageId);
}

export default async function TenantMessagePage(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const [tenantData, pageData] = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		const page = yield* database.private.messages.getMessagePageData({
			messageId: BigInt(params.messageId),
		});
		return [tenant, page] as const;
	}).pipe(runtime.runPromise);

	if (!tenantData?.server || !pageData) {
		return notFound();
	}

	if (pageData.server.discordId !== tenantData.server.discordId) {
		return notFound();
	}

	const canonicalId = pageData.canonicalId.toString();
	if (canonicalId !== params.messageId) {
		redirect(`/m/${canonicalId}`);
	}

	return <MessagePage data={pageData} />;
}
