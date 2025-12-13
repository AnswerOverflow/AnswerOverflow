import { decodeCursor } from "@packages/ui/utils/cursor";
import { getServerCustomUrl } from "@packages/ui/utils/server";
import { Schema } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
	fetchMessagePageHeaderData,
	generateMessagePageMetadata,
	MessagePageLoader,
} from "../../../../components/message-page-loader";

type Props = {
	params: Promise<{ messageId: string }>;
	searchParams: Promise<{ cursor?: string; focus?: string }>;
};

function parseBigInt(value: string) {
	return Schema.decodeUnknownOption(Schema.BigInt)(value);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const [params, searchParams] = await Promise.all([
		props.params,
		props.searchParams,
	]);
	const parsed = parseBigInt(params.messageId);
	if (parsed._tag === "None") {
		return notFound();
	}
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;
	const headerData = await fetchMessagePageHeaderData(parsed.value);
	return generateMessagePageMetadata(headerData, params.messageId, cursor);
}

export default async function Page(props: Props) {
	const [params, searchParams] = await Promise.all([
		props.params,
		props.searchParams,
	]);
	const parsed = parseBigInt(params.messageId);
	if (parsed._tag === "None") {
		return notFound();
	}
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;
	const headerData = await fetchMessagePageHeaderData(parsed.value);

	if (headerData?.server.customDomain) {
		const customUrl = getServerCustomUrl(
			headerData.server,
			`/m/${params.messageId}`,
		);
		if (customUrl) {
			return redirect(customUrl);
		}
	}

	return (
		<MessagePageLoader
			headerData={headerData}
			messageId={params.messageId}
			cursor={cursor ?? undefined}
		/>
	);
}
