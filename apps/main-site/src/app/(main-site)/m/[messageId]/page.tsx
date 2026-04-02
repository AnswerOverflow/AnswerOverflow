import { decodeCursor } from "@packages/ui/utils/cursor";
import { getServerCustomUrl } from "@packages/ui/utils/server";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Option } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
	fetchMessagePageHeaderData,
	generateMessagePageMetadata,
	MessagePageLoader,
	MessagePageSkeleton,
} from "../../../../components/message-page-loader";
import {
	buildSearchQueryString,
	getFirstSearchParamValue,
} from "../../../../lib/search-params";

type SearchParams = {
	cursor?: string | string[];
	focus?: string | string[];
};

type Props = {
	params: Promise<{ messageId: string }>;
	searchParams: Promise<SearchParams>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const parsed = parseSnowflakeId(params.messageId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/m/${parsed.value.cleaned}`);
	}
	const headerData = await fetchMessagePageHeaderData(parsed.value.id);
	return generateMessagePageMetadata(headerData, params.messageId, {
		cursorParam: getFirstSearchParamValue(searchParams.cursor),
		focusMessageId: getFirstSearchParamValue(searchParams.focus),
	});
}

async function MessagePageContent(props: Props) {
	const params = await props.searchParams;
	const messageId = (await props.params).messageId;
	const cursorParam = getFirstSearchParamValue(params.cursor);
	const cursor = cursorParam ? decodeCursor(cursorParam) : undefined;

	const parsed = parseSnowflakeId(messageId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/m/${parsed.value.cleaned}`);
	}

	const headerData = await fetchMessagePageHeaderData(parsed.value.id);

	if (headerData?.server.customDomain) {
		const customUrl = getServerCustomUrl(
			headerData.server,
			`/m/${messageId}${buildSearchQueryString(params)}`,
		);
		if (customUrl) {
			return redirect(customUrl);
		}
	}

	return (
		<MessagePageLoader
			headerData={headerData}
			messageId={messageId}
			cursor={cursor}
		/>
	);
}

export default async function Page(props: Props) {
	return (
		<Suspense fallback={<MessagePageSkeleton />}>
			<MessagePageContent {...props} />
		</Suspense>
	);
}
