import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import { ChannelThreadCardSkeleton } from "@packages/ui/components/thread-card";
import {
	getTenantCanonicalUrl,
	type TenantInfo,
} from "@packages/ui/utils/links";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { runtime } from "../lib/runtime";
import { ChannelPageContent, ServerPageContent } from "./channel-page-content";

export type ServerPageHeaderData = NonNullable<
	FunctionReturnType<typeof api.private.channels.getServerPageHeaderData>
>;

export type ChannelPageHeaderData = NonNullable<
	FunctionReturnType<typeof api.private.channels.getChannelPageHeaderData>
>;

export type ChannelPageThreads = FunctionReturnType<
	typeof api.public.channels.getChannelPageThreads
>;

export type ServerPageThreads = FunctionReturnType<
	typeof api.public.channels.getServerPageThreads
>;

export async function fetchServerPageHeaderData(
	serverDiscordId: bigint,
): Promise<ServerPageHeaderData | null> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.channels.getServerPageHeaderData({
			serverDiscordId,
		});
	}).pipe(runtime.runPromise);
}

export async function fetchChannelPageHeaderData(
	serverDiscordId: bigint,
	channelDiscordId: bigint,
): Promise<ChannelPageHeaderData | null> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.channels.getChannelPageHeaderData({
			serverDiscordId,
			channelDiscordId,
		});
	}).pipe(runtime.runPromise);
}

export async function fetchChannelPageThreads(
	channelDiscordId: bigint,
	cursor: string | null = null,
): Promise<ChannelPageThreads> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.channels.getChannelPageThreads({
			channelDiscordId,
			paginationOpts: { numItems: 20, cursor },
		});
	}).pipe(runtime.runPromise);
}

export async function fetchServerPageThreads(
	serverDiscordId: bigint,
	cursor: string | null = null,
): Promise<ServerPageThreads> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.channels.getServerPageThreads({
			serverDiscordId,
			paginationOpts: { numItems: 20, cursor },
		});
	}).pipe(runtime.runPromise);
}

export function generateServerPageMetadata(
	headerData: ServerPageHeaderData | null,
	basePath: string,
	tenant: TenantInfo | null = null,
): Metadata {
	if (!headerData) {
		return {};
	}

	const isTenant = tenant !== null;
	const { server } = headerData;
	const description =
		server.description ??
		`Browse threads from the ${server.name} Discord community`;
	const title = server.name;
	const ogImage = isTenant
		? `/og/community?id=${server.discordId.toString()}&tenant=true`
		: `/og/community?id=${server.discordId.toString()}`;

	const canonicalUrl = getTenantCanonicalUrl(tenant, basePath);

	return {
		title,
		description,
		openGraph: {
			type: "website",
			siteName: isTenant ? server.name : "Answer Overflow",
			images: [ogImage],
			title,
			description,
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [ogImage],
		},
		alternates: {
			canonical: canonicalUrl,
		},
		robots: "index, follow",
	};
}

export function generateChannelPageMetadata(
	headerData: ChannelPageHeaderData | null,
	basePath: string,
	_cursor: string | null,
	tenant: TenantInfo | null = null,
): Metadata {
	if (!headerData) {
		return {};
	}

	const isTenant = tenant !== null;
	const { server, selectedChannel } = headerData;
	const description = `Browse threads from #${selectedChannel.name} in the ${server.name} Discord community`;
	const title = `#${selectedChannel.name} - ${server.name}`;
	const ogImage = isTenant
		? `/og/community?id=${server.discordId.toString()}&tenant=true`
		: `/og/community?id=${server.discordId.toString()}`;

	const canonicalUrl = getTenantCanonicalUrl(tenant, basePath);

	return {
		title,
		description,
		openGraph: {
			type: "website",
			siteName: isTenant ? server.name : "Answer Overflow",
			images: [ogImage],
			title,
			description,
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [ogImage],
		},
		alternates: {
			canonical: canonicalUrl,
		},
		robots: "noindex, follow",
	};
}

function ThreadsSkeleton() {
	return (
		<div className="space-y-4">
			{Array.from({ length: 5 }).map((_, i) => (
				<ChannelThreadCardSkeleton key={`skeleton-${i}`} />
			))}
		</div>
	);
}

function ServerPageSkeleton({
	headerData,
}: {
	headerData: ServerPageHeaderData;
}) {
	return (
		<div className="min-h-screen bg-background">
			<div className="border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex items-start gap-4">
						<div className="size-16 shrink-0 rounded-full bg-muted animate-pulse" />
						<div className="flex-1 min-w-0">
							<div className="h-7 w-48 bg-muted animate-pulse rounded mb-2" />
							<div className="h-4 w-full max-w-md bg-muted animate-pulse rounded" />
						</div>
					</div>
				</div>
			</div>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex gap-8">
					<div className="hidden lg:block w-52 shrink-0">
						<div className="space-y-2">
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={`channel-skeleton-${i}`}
									className="h-8 bg-muted animate-pulse rounded"
								/>
							))}
						</div>
					</div>
					<main className="flex-1 min-w-0">
						<div className="h-10 bg-muted animate-pulse rounded mb-6" />
						<ThreadsSkeleton />
					</main>
				</div>
			</div>
		</div>
	);
}

function ChannelPageSkeleton({
	headerData,
}: {
	headerData: ChannelPageHeaderData;
}) {
	return (
		<div className="min-h-screen bg-background">
			<div className="border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex items-start gap-4">
						<div className="size-16 shrink-0 rounded-full bg-muted animate-pulse" />
						<div className="flex-1 min-w-0">
							<div className="h-7 w-48 bg-muted animate-pulse rounded mb-2" />
							<div className="h-4 w-full max-w-md bg-muted animate-pulse rounded" />
						</div>
					</div>
				</div>
			</div>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex gap-8">
					<div className="hidden lg:block w-52 shrink-0">
						<div className="space-y-2">
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={`channel-skeleton-${i}`}
									className="h-8 bg-muted animate-pulse rounded"
								/>
							))}
						</div>
					</div>
					<main className="flex-1 min-w-0">
						<div className="h-10 bg-muted animate-pulse rounded mb-6" />
						<ThreadsSkeleton />
					</main>
				</div>
			</div>
		</div>
	);
}

async function ServerPageLoaderInner(props: {
	headerData: ServerPageHeaderData;
	cursor: string | null;
}) {
	const initialData = await fetchServerPageThreads(
		props.headerData.server.discordId,
		props.cursor,
	);

	return (
		<ServerPageContent
			server={props.headerData.server}
			channels={props.headerData.channels}
			initialData={initialData}
			nextCursor={initialData.isDone ? null : initialData.continueCursor}
			currentCursor={props.cursor}
		/>
	);
}

async function ChannelPageLoaderInner(props: {
	headerData: ChannelPageHeaderData;
	cursor: string | null;
}) {
	const initialData = await fetchChannelPageThreads(
		props.headerData.selectedChannel.id,
		props.cursor,
	);

	return (
		<ChannelPageContent
			server={props.headerData.server}
			channels={props.headerData.channels}
			selectedChannel={props.headerData.selectedChannel}
			initialData={initialData}
			nextCursor={initialData.isDone ? null : initialData.continueCursor}
			currentCursor={props.cursor}
		/>
	);
}

export async function ServerPageLoader(props: {
	headerData: ServerPageHeaderData | null;
	cursor?: string;
}) {
	const { headerData, cursor } = props;

	if (!headerData) {
		return notFound();
	}

	return (
		<Suspense fallback={<ServerPageSkeleton headerData={headerData} />}>
			<ServerPageLoaderInner headerData={headerData} cursor={cursor ?? null} />
		</Suspense>
	);
}

export async function ChannelPageLoader(props: {
	headerData: ChannelPageHeaderData | null;
	cursor?: string;
}) {
	const { headerData, cursor } = props;

	if (!headerData) {
		return notFound();
	}

	return (
		<Suspense fallback={<ChannelPageSkeleton headerData={headerData} />}>
			<ChannelPageLoaderInner headerData={headerData} cursor={cursor ?? null} />
		</Suspense>
	);
}
