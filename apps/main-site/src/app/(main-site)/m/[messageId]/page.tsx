import { Database } from "@packages/database/database";
import { Skeleton } from "@packages/ui/components/skeleton";
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
	searchParams: Promise<{ cursor?: string; focus?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const [params, searchParams] = await Promise.all([
		props.params,
		props.searchParams,
	]);
	const parsed = parseSnowflakeId(params.messageId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/m/${parsed.value.cleaned}`);
	}
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;
	const headerData = await fetchMessagePageHeaderData(parsed.value.id);
	return generateMessagePageMetadata(headerData, params.messageId, cursor);
}

function MessagePageSkeleton() {
	return (
		<div className="mx-auto pt-2 pb-16">
			<div className="flex w-full flex-col justify-center gap-4 md:flex-row">
				<main className="flex w-full max-w-3xl grow flex-col gap-4">
					<div className="flex flex-col gap-2 pl-2">
						<div className="flex flex-row items-center gap-2">
							<Skeleton className="h-12 w-12 rounded-full" />
							<div className="flex flex-col gap-1">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-24" />
							</div>
						</div>
						<Skeleton className="h-8 w-3/4" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					</div>
					<Skeleton className="h-px w-full my-4" />
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="p-2">
								<div className="flex flex-row min-w-0">
									<Skeleton className="h-10 w-10 rounded-full shrink-0" />
									<div className="flex flex-col pl-2 pt-2 min-w-0 flex-1 gap-2">
										<div className="flex flex-row items-center gap-2">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-3 w-16" />
										</div>
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-3/4" />
									</div>
								</div>
							</div>
						))}
					</div>
				</main>
				<div className="hidden md:flex w-[400px] shrink-0 flex-col items-center gap-4">
					<div className="w-full rounded-md border-2 bg-card overflow-hidden">
						<Skeleton className="w-full aspect-[5/2]" />
						<div className="flex flex-col items-start gap-4 p-4">
							<div className="flex w-full flex-row items-center justify-between">
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-8 w-16 rounded-3xl" />
							</div>
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

async function MessagePageContent(props: {
	messageId: string;
	cursor?: string;
}) {
	"use cache";
	cacheLife("minutes");
	cacheTag("message-page", props.messageId);

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
			cursor={props.cursor}
		/>
	);
}

export default async function Page(props: Props) {
	const [params, searchParams] = await Promise.all([
		props.params,
		props.searchParams,
	]);
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;

	return (
		<Suspense fallback={<MessagePageSkeleton />}>
			<MessagePageContent
				messageId={params.messageId}
				cursor={cursor ?? undefined}
			/>
		</Suspense>
	);
}
