import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { getServerCustomUrl } from "@packages/ui/utils/server";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Effect, Option } from "effect";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
	fetchMessagePageHeaderData,
	generateMessagePageMetadata,
	MessagePageLoader,
	MessagePageSkeleton,
} from "../../../../components/message-page-loader";
import { runtime } from "../../../../lib/runtime";

export async function generateStaticParams() {
	const result = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.search.getRecentThreads({
			paginationOpts: { numItems: 10, cursor: null },
		});
	}).pipe(runtime.runPromise);

	return result.page.map((thread) => ({
		messageId: thread.message.message.id.toString(),
	}));
}

type Props = {
	params: Promise<{ messageId: string }>;
	searchParams: Promise<{ cursor?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const parsed = parseSnowflakeId(params.messageId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/m/${parsed.value.cleaned}`);
	}
	const headerData = await fetchMessagePageHeaderData(parsed.value.id);
	return generateMessagePageMetadata(headerData, params.messageId, null);
}

async function MessagePageContent(props: {
	messageId: string;
	searchParams: Promise<{ cursor?: string }>;
}) {
	const params = await props.searchParams;
	const cursor = params.cursor ? decodeCursor(params.cursor) : undefined;

	const parsed = parseSnowflakeId(props.messageId);
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
			`/m/${props.messageId}`,
		);
		if (customUrl) {
			return redirect(customUrl);
		}
	}

	return (
		<MessagePageLoader
			headerData={headerData}
			messageId={props.messageId}
			cursor={cursor}
		/>
	);
}

export default async function Page(props: Props) {
	const params = await props.params;

	return (
		<Suspense fallback={<MessagePageSkeleton />}>
			<MessagePageContent
				messageId={params.messageId}
				searchParams={props.searchParams}
			/>
		</Suspense>
	);
}
