import { Database } from "@packages/database/database";
import { Effect, Schema } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MessagePage } from "../../../../components/message-page";
import {
	fetchMessagePageData,
	generateMessagePageMetadata,
} from "../../../../components/message-page-loader";
import { runtime } from "../../../../lib/runtime";

type Props = {
	params: Promise<{ domain: string; messageId: string }>;
};

function parseBigInt(value: string) {
	return Schema.decodeUnknownOption(Schema.BigInt)(value);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const parsed = parseBigInt(params.messageId);
	if (parsed._tag === "None") {
		return notFound();
	}
	const pageData = await fetchMessagePageData(parsed.value);
	return generateMessagePageMetadata(pageData, params.messageId);
}

export default async function TenantMessagePage(props: Props) {
	const params = await props.params;
	const parsed = parseBigInt(params.messageId);
	if (parsed._tag === "None") {
		return notFound();
	}
	const domain = decodeURIComponent(params.domain);

	const [tenantData, pageData] = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		const page = yield* database.private.messages.getMessagePageData({
			messageId: parsed.value,
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
		redirect(`/m/${canonicalId}?focus=${params.messageId}`);
	}

	return <MessagePage data={pageData} />;
}
