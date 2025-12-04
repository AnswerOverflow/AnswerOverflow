import { Schema } from "effect";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	fetchMessagePageHeaderData,
	generateMessagePageMetadata,
	MessagePageLoader,
} from "../../../components/message-page-loader";

type Props = {
	params: Promise<{ messageId: string }>;
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
	const headerData = await fetchMessagePageHeaderData(parsed.value);
	return generateMessagePageMetadata(headerData, params.messageId);
}

export default async function Page(props: Props) {
	const params = await props.params;
	const parsed = parseBigInt(params.messageId);
	if (parsed._tag === "None") {
		return notFound();
	}
	const headerData = await fetchMessagePageHeaderData(parsed.value);
	return (
		<MessagePageLoader headerData={headerData} messageId={params.messageId} />
	);
}
