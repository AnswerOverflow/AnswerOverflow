import { makeUseQueryWithStatus } from "convex-helpers/react";
import type {
	PaginatedQueryArgs,
	PaginatedQueryItem,
	PaginatedQueryReference,
	UsePaginatedQueryReturnType,
} from "convex/react";
import { usePaginatedQuery, useQueries, useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import { convexToJson, type Value } from "convex/values";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const useQueryWithStatus = makeUseQueryWithStatus(useQueries);

export const useStableQuery = ((name, ...args) => {
	const result = useQueryWithStatus(name, ...args);
	const stored = useRef(result?.data);

	if (result !== undefined) {
		stored.current = result?.data;
	}

	return stored.current;
}) as typeof useQuery;

export const useStablePaginatedQuery = ((name, args, options) => {
	const result = usePaginatedQuery(name, args, options);
	const stored = useRef(result);

	if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
		stored.current = result;
	}

	return stored.current;
}) as typeof usePaginatedQuery;

type PaginatedQueryOptions = {
	initialNumItems: number;
	initialCursor?: string | null;
};

type PageResult<Query extends PaginatedQueryReference> = {
	page: Array<PaginatedQueryItem<Query>>;
	isDone: boolean;
	continueCursor: string;
};

export function usePaginatedQueryWithCursor<
	Query extends PaginatedQueryReference,
>(
	query: Query,
	args: PaginatedQueryArgs<Query> | "skip",
	options: PaginatedQueryOptions,
): UsePaginatedQueryReturnType<Query> {
	const { initialNumItems, initialCursor = null } = options;
	const skip = args === "skip";

	const argsKey = skip
		? "skip"
		: JSON.stringify(convexToJson(args as Record<string, Value>));

	const [additionalPages, setAdditionalPages] = useState<
		Array<{ cursor: string; numItems: number }>
	>([]);

	const prevArgsKeyRef = useRef(argsKey);
	useEffect(() => {
		if (prevArgsKeyRef.current !== argsKey) {
			prevArgsKeyRef.current = argsKey;
			setAdditionalPages([]);
		}
	}, [argsKey]);

	const queries = useMemo(() => {
		if (skip) return {};

		const queryMap: Record<
			string,
			{ query: FunctionReference<"query">; args: Record<string, Value> }
		> = {
			page0: {
				query: query as FunctionReference<"query">,
				args: {
					...(args as Record<string, Value>),
					paginationOpts: {
						numItems: initialNumItems,
						cursor: initialCursor,
					},
				},
			},
		};

		additionalPages.forEach((page, index) => {
			queryMap[`page${index + 1}`] = {
				query: query as FunctionReference<"query">,
				args: {
					...(args as Record<string, Value>),
					paginationOpts: {
						numItems: page.numItems,
						cursor: page.cursor,
					},
				},
			};
		});

		return queryMap;
	}, [skip, query, args, initialNumItems, initialCursor, additionalPages]);

	const results = useQueries(queries);

	const pageResults = useMemo(() => {
		const pages: Array<PageResult<Query> | undefined> = [];
		const totalPages = 1 + additionalPages.length;

		for (let i = 0; i < totalPages; i++) {
			const result = results[`page${i}`];
			if (result instanceof Error) {
				throw result;
			}
			pages.push(result as PageResult<Query> | undefined);
		}

		return pages;
	}, [results, additionalPages.length]);

	const allItems = useMemo(() => {
		const items: Array<PaginatedQueryItem<Query>> = [];
		for (const pageResult of pageResults) {
			if (pageResult) {
				items.push(...pageResult.page);
			}
		}
		return items;
	}, [pageResults]);

	const lastLoadedResult = useMemo(() => {
		for (let i = pageResults.length - 1; i >= 0; i--) {
			if (pageResults[i]) return pageResults[i];
		}
		return undefined;
	}, [pageResults]);

	const firstPageResult = pageResults[0];
	const isLoadingMore =
		additionalPages.length > 0 &&
		pageResults.some(
			(r, i) => r === undefined && i > 0 && i <= additionalPages.length,
		);

	const loadMore = useCallback(
		(numItems: number) => {
			if (!lastLoadedResult || lastLoadedResult.isDone) return;

			const alreadyLoading = additionalPages.some(
				(p) => p.cursor === lastLoadedResult.continueCursor,
			);
			if (alreadyLoading) return;

			setAdditionalPages((prev) => [
				...prev,
				{ cursor: lastLoadedResult.continueCursor, numItems },
			]);
		},
		[lastLoadedResult, additionalPages],
	);

	const stored = useRef<UsePaginatedQueryReturnType<Query> | undefined>(
		undefined,
	);

	const noopLoadMore = useCallback((_numItems: number) => {}, []);

	const result = useMemo((): UsePaginatedQueryReturnType<Query> => {
		if (!firstPageResult) {
			return {
				results: [],
				status: "LoadingFirstPage",
				isLoading: true,
				loadMore: noopLoadMore,
			};
		}

		if (isLoadingMore) {
			return {
				results: allItems,
				status: "LoadingMore",
				isLoading: true,
				loadMore: noopLoadMore,
			};
		}

		if (lastLoadedResult?.isDone) {
			return {
				results: allItems,
				status: "Exhausted",
				isLoading: false,
				loadMore: noopLoadMore,
			};
		}

		return {
			results: allItems,
			status: "CanLoadMore",
			isLoading: false,
			loadMore,
		};
	}, [
		firstPageResult,
		isLoadingMore,
		lastLoadedResult,
		allItems,
		loadMore,
		noopLoadMore,
	]);

	if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
		stored.current = result;
	}

	return stored.current ?? result;
}
