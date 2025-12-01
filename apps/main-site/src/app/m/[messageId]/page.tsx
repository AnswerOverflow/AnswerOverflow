import type { Metadata } from "next";
import {
	fetchMessagePageData,
	generateMessagePageMetadata,
	MessagePageLoader,
} from "../../../components/message-page-loader";

type Props = {
	params: Promise<{ messageId: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const pageData = await fetchMessagePageData(BigInt(params.messageId));
	return generateMessagePageMetadata(pageData, params.messageId);
}

export default async function Page(props: Props) {
	const params = await props.params;
	const pageData = await fetchMessagePageData(BigInt(params.messageId));
	return <MessagePageLoader pageData={pageData} messageId={params.messageId} />;
}
