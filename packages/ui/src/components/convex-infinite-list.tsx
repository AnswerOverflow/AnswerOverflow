"use client";

import type {
	PaginatedQueryArgs,
	PaginatedQueryItem,
	PaginatedQueryReference,
} from "convex/react";

import { type ReactNode, useCallback, useRef } from "react";
import { Virtuoso } from "react-virtuoso";
import { useCachedPaginatedQuery } from "../hooks/use-cached-paginated-query";

type ConvexInfiniteListProps<Query extends PaginatedQueryReference> = {
	query: Query;
	queryArgs: PaginatedQueryArgs<Query>;
	pageSize?: number;
	renderItem: (item: PaginatedQueryItem<Query>, index: number) => ReactNode;
	loader: ReactNode;
	initialLoaderCount?: number;
	loadMoreLoaderCount?: number;
	emptyState?: ReactNode;
	className?: string;
	itemClassName?: string;
	initialData?: {
		page: Array<PaginatedQueryItem<Query>>;
		continueCursor: string;
		isDone: boolean;
	};
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
	loader: loaderElement,
	initialLoaderCount = 5,
	loadMoreLoaderCount = 3,
	emptyState,
	initialData,
	className,
	itemClassName = "mb-4",
}: ConvexInfiniteListProps<Query>) {
	const { results, status, loadMore } = useCachedPaginatedQuery(
		query,
		queryArgs,
		{ initialNumItems: pageSize, initialData },
	);

	const canLoadMore = status === "CanLoadMore";
	const isLoadingMore = status === "LoadingMore";
	const lastPageTriggered = useRef(0);

	const handleRangeChanged = useCallback(
		(range: { startIndex: number; endIndex: number }) => {
			if (!canLoadMore) return;

			const currentPage = Math.floor(range.endIndex / pageSize);
			if (currentPage > lastPageTriggered.current) {
				lastPageTriggered.current = currentPage;
				loadMore(pageSize);
			}
		},
		[canLoadMore, loadMore, pageSize],
	);

	const isLoadingFirstPage = status === "LoadingFirstPage";
	const hasResults = results && results.length > 0;

	const isInitialLoading = isLoadingFirstPage && !initialData;
	const isEmpty =
		(status === "Exhausted" ||
			(initialData?.isDone && initialData.page.length === 0)) &&
		!hasResults;

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
			useWindowScroll
			data={results}
			className={className}
			rangeChanged={handleRangeChanged}
			overscan={200}
			itemContent={(index, item) => (
				<div className={itemClassName}>{renderItem(item, index)}</div>
			)}
			components={{
				Footer: () => (
					<>
						{(isLoadingMore || canLoadMore) && (
							<LoadingSkeletons
								count={loadMoreLoaderCount}
								loader={loaderElement}
							/>
						)}
						<div className="hidden sm:block h-16" aria-hidden="true" />
					</>
				),
			}}
		/>
	);
}
