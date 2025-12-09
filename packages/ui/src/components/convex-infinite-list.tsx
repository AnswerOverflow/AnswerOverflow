"use client";

import type {
	PaginatedQueryArgs,
	PaginatedQueryItem,
	PaginatedQueryReference,
} from "convex/react";

import type { ReactNode } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Virtuoso } from "react-virtuoso";
import { useStablePaginatedQuery } from "../hooks/use-stable-query";
import { useSession } from "./convex-client-provider";

type ConvexInfiniteListProps<Query extends PaginatedQueryReference> = {
	query: Query;
	queryArgs: PaginatedQueryArgs<Query>;
	pageSize?: number;
	renderItem: (item: PaginatedQueryItem<Query>, index: number) => ReactNode;
	virtualized?: boolean;
	height?: number;
	loader?: ReactNode;
	initialLoaderCount?: number;
	emptyState?: ReactNode;
	scrollThreshold?: number;
	authenticationType?: "all" | "non-anonymous";
};

function LoadingSkeletons({
	count,
	loader,
}: {
	count: number;
	loader: ReactNode;
}) {
	return (
		<div className="space-y-4">
			{Array.from({ length: count }).map((_, i) => (
				<div key={`loader-${i}`}>{loader}</div>
			))}
		</div>
	);
}

export function ConvexInfiniteList<Query extends PaginatedQueryReference>({
	query,
	queryArgs,
	pageSize = 30,
	renderItem,
	virtualized = false,
	height = 600,
	loader,
	initialLoaderCount = 5,
	emptyState,
	scrollThreshold = 0.8,
	authenticationType = "all",
}: ConvexInfiniteListProps<Query>) {
	const session = useSession({ allowAnonymous: authenticationType === "all" });
	const isSessionReady = !session?.isPending && session?.data !== undefined;

	const { results, status, loadMore, isLoading } = useStablePaginatedQuery(
		query,
		isSessionReady ? queryArgs : "skip",
		{ initialNumItems: pageSize },
	);

	const hasMore = status === "CanLoadMore";

	const loadMorePage = () => {
		if (status === "CanLoadMore") {
			loadMore(pageSize);
		}
	};

	const defaultLoader = (
		<div className="py-2 text-sm text-muted-foreground">Loading…</div>
	);
	const loaderElement = loader ?? defaultLoader;

	const isWaitingForSession = !isSessionReady;
	const isLoadingFirstPage = status === "LoadingFirstPage";
	const hasResults = results && results.length > 0;
	const isInitialLoading = isWaitingForSession || isLoadingFirstPage;
	const isEmpty = status === "Exhausted" && !hasResults;

	if (!virtualized) {
		if (isInitialLoading) {
			return (
				<LoadingSkeletons count={initialLoaderCount} loader={loaderElement} />
			);
		}

		if (isEmpty && emptyState) {
			return <>{emptyState}</>;
		}

		if (!hasResults) {
			return (
				<LoadingSkeletons count={initialLoaderCount} loader={loaderElement} />
			);
		}

		return (
			<InfiniteScroll
				dataLength={results.length}
				next={loadMorePage}
				hasMore={hasMore}
				loader={loaderElement}
				scrollThreshold={scrollThreshold}
			>
				{results.map((item, i) => renderItem(item, i))}
			</InfiniteScroll>
		);
	}

	if (isInitialLoading) {
		return (
			<LoadingSkeletons count={initialLoaderCount} loader={loaderElement} />
		);
	}

	if (isEmpty && emptyState) {
		return <>{emptyState}</>;
	}

	if (!hasResults) {
		return (
			<LoadingSkeletons count={initialLoaderCount} loader={loaderElement} />
		);
	}

	return (
		<Virtuoso
			style={{ height }}
			data={results}
			endReached={() => {
				if (hasMore && !isLoading) {
					loadMorePage();
				}
			}}
			itemContent={(index, item) => renderItem(item, index)}
		/>
	);
}
