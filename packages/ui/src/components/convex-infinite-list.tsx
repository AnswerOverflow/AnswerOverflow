"use client";

import type {
	PaginatedQueryArgs,
	PaginatedQueryItem,
	PaginatedQueryReference,
} from "convex/react";

import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { usePaginatedQueryWithCursor } from "../hooks/use-stable-query";
import { Button } from "./button";
import { useSession } from "./convex-client-provider";

type ConvexInfiniteListProps<Query extends PaginatedQueryReference> = {
	query: Query;
	queryArgs: PaginatedQueryArgs<Query>;
	pageSize?: number;
	renderItem: (item: PaginatedQueryItem<Query>, index: number) => ReactNode;
	loader?: ReactNode;
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

function useIntersectionObserver(onIntersect: () => void, enabled: boolean) {
	const ref = useRef<HTMLDivElement>(null);
	const onIntersectRef = useRef(onIntersect);
	onIntersectRef.current = onIntersect;

	useEffect(() => {
		if (!enabled) return;

		const element = ref.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					onIntersectRef.current();
				}
			},
			{ rootMargin: "100%" },
		);

		observer.observe(element);
		return () => observer.disconnect();
	}, [enabled]);

	return ref;
}

export function ConvexInfiniteList<Query extends PaginatedQueryReference>({
	query,
	queryArgs,
	pageSize = 30,
	renderItem,
	loader,
	initialLoaderCount = 5,
	loadMoreLoaderCount = 3,
	emptyState,
	authenticationType = "all",
	initialData,
	initialCursor = null,
	showLoadMoreButton = false,
	className,
}: ConvexInfiniteListProps<Query>) {
	const session = useSession({ allowAnonymous: authenticationType === "all" });
	const isSessionReady = !session?.isPending && session?.data !== undefined;

	const { results, status, loadMore } = usePaginatedQueryWithCursor(
		query,
		isSessionReady ? queryArgs : "skip",
		{ initialNumItems: pageSize, initialCursor },
	);

	const canLoadMore = status === "CanLoadMore";
	const isLoadingMore = status === "LoadingMore";

	const handleLoadMore = useCallback(() => {
		if (canLoadMore) {
			loadMore(pageSize);
		}
	}, [canLoadMore, loadMore, pageSize]);

	const sentinelRef = useIntersectionObserver(
		handleLoadMore,
		canLoadMore && !showLoadMoreButton,
	);

	const defaultLoader = (
		<div className="py-2 text-sm text-muted-foreground">Loading…</div>
	);
	const loaderElement = loader ?? defaultLoader;

	const isWaitingForSession = !isSessionReady;
	const isLoadingFirstPage = status === "LoadingFirstPage";
	const displayResults =
		results && results.length > 0 ? results : initialData?.page;
	const hasResults = displayResults && displayResults.length > 0;
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

	return (
		<div className={className}>
			{displayResults.map((item, i) => renderItem(item, i))}

			{canLoadMore && !isLoadingMore && showLoadMoreButton && (
				<div className="py-4 flex justify-center">
					<Button variant="outline" onClick={handleLoadMore}>
						Load More
					</Button>
				</div>
			)}

			{canLoadMore && !showLoadMoreButton && (
				<div ref={sentinelRef} className="h-4" />
			)}

			{(isLoadingMore || canLoadMore) && !showLoadMoreButton && (
				<LoadingSkeletons count={loadMoreLoaderCount} loader={loaderElement} />
			)}
		</div>
	);
}
