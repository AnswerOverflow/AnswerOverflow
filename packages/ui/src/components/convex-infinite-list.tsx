"use client";

import type {
	PaginatedQueryArgs,
	PaginatedQueryItem,
	PaginatedQueryReference,
} from "convex/react";

import { type ReactNode, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import { usePaginatedQueryWithCursor } from "../hooks/use-stable-query";
import { Button } from "./button";
import { useSession } from "./convex-client-provider";

type ConvexInfiniteListProps<Query extends PaginatedQueryReference> = {
	query: Query;
	queryArgs: PaginatedQueryArgs<Query>;
	pageSize?: number;
	renderItem: (item: PaginatedQueryItem<Query>, index: number) => ReactNode;
	loader: ReactNode;
	initialLoaderCount?: number;
	loadMoreLoaderCount?: number;
	emptyState?: ReactNode;
	authenticationType?: "all" | "non-anonymous";
	initialData?: {
		page: Array<PaginatedQueryItem<Query>>;
		continueCursor: string;
		isDone: boolean;
	};
	initialCursor?: string | null;
	showLoadMoreButton?: boolean;
	className?: string;
	itemClassName?: string;
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
	authenticationType = "all",
	initialData,
	initialCursor = null,
	showLoadMoreButton = false,
	className,
	itemClassName = "mb-4",
}: ConvexInfiniteListProps<Query>) {
	const session = useSession({ allowAnonymous: authenticationType === "all" });
	const isSessionReady = !session?.isPending && session?.data !== undefined;

	const { results, status, loadMore } = usePaginatedQueryWithCursor(
		query,
		isSessionReady ? queryArgs : "skip",
		{ initialNumItems: pageSize, initialCursor, initialData },
	);

	const canLoadMore = status === "CanLoadMore";
	const isLoadingMore = status === "LoadingMore";

	const handleLoadMore = useCallback(() => {
		if (canLoadMore) {
			loadMore(pageSize);
		}
	}, [canLoadMore, loadMore, pageSize]);

	const isWaitingForSession = !isSessionReady;
	const isLoadingFirstPage = status === "LoadingFirstPage";
	const hasResults = results && results.length > 0;
	const isInitialLoading =
		(isWaitingForSession || isLoadingFirstPage) && !initialData;
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

	if (showLoadMoreButton) {
		return (
			<div className={className}>
				{results.map((item, i) => (
					<div key={i} className={itemClassName}>
						{renderItem(item, i)}
					</div>
				))}
				{canLoadMore && !isLoadingMore && (
					<div className="py-4 flex justify-center">
						<Button variant="outline" onClick={handleLoadMore}>
							Load More
						</Button>
					</div>
				)}
				{isLoadingMore && (
					<LoadingSkeletons
						count={loadMoreLoaderCount}
						loader={loaderElement}
					/>
				)}
			</div>
		);
	}

	return (
		<Virtuoso
			useWindowScroll
			data={results}
			className={className}
			endReached={handleLoadMore}
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
