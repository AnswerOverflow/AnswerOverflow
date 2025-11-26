"use client";

import type {
	PaginatedQueryArgs,
	PaginatedQueryItem,
	PaginatedQueryReference,
} from "convex/react";

import type { ReactNode } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Virtuoso } from "react-virtuoso";
import {
	useAuthenticatedStablePaginatedQuery,
	useStablePaginatedQuery,
} from "../hooks/use-stable-query";

type ConvexInfiniteListProps<Query extends PaginatedQueryReference> = {
	query: Query;
	queryArgs: PaginatedQueryArgs<Query>;
	pageSize?: number;
	renderItem: (item: PaginatedQueryItem<Query>, index: number) => ReactNode;
	virtualized?: boolean;
	height?: number;
	loader?: ReactNode;
	scrollThreshold?: number;
	authenticated?: boolean;
};

export function ConvexInfiniteList<Query extends PaginatedQueryReference>({
	query,
	queryArgs,
	pageSize = 30,
	renderItem,
	virtualized = false,
	height = 600,
	loader = <div className="py-2 text-sm text-gray-500">Loading…</div>,
	scrollThreshold = 0.8,
	authenticated = true,
}: ConvexInfiniteListProps<Query>) {
	const useQueryHook = authenticated
		? useAuthenticatedStablePaginatedQuery
		: useStablePaginatedQuery;
	const { results, status, loadMore, isLoading } = useQueryHook(
		query,
		queryArgs,
		{ initialNumItems: pageSize },
	);

	const hasMore = status === "CanLoadMore";

	const loadMorePage = () => {
		if (status === "CanLoadMore") {
			loadMore(pageSize);
		}
	};

	const isInitialLoading =
		status === "LoadingFirstPage" && results.length === 0;

	if (!virtualized) {
		if (isInitialLoading) {
			return <>{loader}</>;
		}

		return (
			<InfiniteScroll
				dataLength={results.length}
				next={loadMorePage}
				hasMore={hasMore}
				loader={loader}
				scrollThreshold={scrollThreshold}
			>
				{results.map((item, i) => renderItem(item, i))}
			</InfiniteScroll>
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
