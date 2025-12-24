import type {
	PaginatedQueryArgs,
	PaginatedQueryReference,
	UsePaginatedQueryReturnType,
} from "convex/react";
import type { FunctionReference } from "convex/server";
import { getFunctionName } from "convex/server";
import { convexToJson, type Value } from "convex/values";
import { useQueries } from "convex-helpers/react/cache/hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PageInfo = {
	cursor: string;
	numItems: number;
};

type PaginationState = {
	pages: PageInfo[];
	lastCursor: string | null;
	isDone: boolean;
};

type PageResult = {
	page: Array<Value>;
	isDone: boolean;
	continueCursor: string;
};

const paginationCache = new Map<string, PaginationState>();
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

function getPaginationCacheKey(
	queryName: string,
	args: Record<string, Value>,
): string {
	return JSON.stringify([queryName, convexToJson(args)]);
}

function getCachedPaginationState(key: string): PaginationState | null {
	return paginationCache.get(key) ?? null;
}

function setCachedPaginationState(key: string, state: PaginationState): void {
	paginationCache.set(key, state);
	setTimeout(() => {
		if (paginationCache.get(key) === state) {
			paginationCache.delete(key);
		}
	}, CACHE_EXPIRY_MS);
}

export function useCachedPaginatedQuery<Query extends PaginatedQueryReference>(
	query: Query,
	args: PaginatedQueryArgs<Query> | "skip",
	options: { initialNumItems: number },
): UsePaginatedQueryReturnType<Query> {
	const { initialNumItems } = options;
	const skip = args === "skip";

	const queryName = getFunctionName(query);
	const argsForKey = skip ? {} : (args as Record<string, Value>);
	const cacheKey = getPaginationCacheKey(queryName, argsForKey);

	const cachedState = skip ? null : getCachedPaginationState(cacheKey);

	const [pages, setPages] = useState<PageInfo[]>(() => {
		if (cachedState && cachedState.pages.length > 0) {
			return cachedState.pages;
		}
		return [{ cursor: "", numItems: initialNumItems }];
	});

	const prevCacheKeyRef = useRef(cacheKey);

	useEffect(() => {
		if (prevCacheKeyRef.current !== cacheKey) {
			prevCacheKeyRef.current = cacheKey;
			const newCachedState = skip ? null : getCachedPaginationState(cacheKey);
			if (newCachedState && newCachedState.pages.length > 0) {
				setPages(newCachedState.pages);
			} else {
				setPages([{ cursor: "", numItems: initialNumItems }]);
			}
		}
	}, [cacheKey, skip, initialNumItems]);

	const queries = useMemo(() => {
		if (skip) {
			return {};
		}

		const queryMap: Record<
			string,
			{ query: FunctionReference<"query">; args: Record<string, Value> }
		> = {};

		pages.forEach((page, index) => {
			queryMap[`page${index}`] = {
				query: query as FunctionReference<"query">,
				args: {
					...(args as Record<string, Value>),
					paginationOpts: {
						numItems: page.numItems,
						cursor: page.cursor === "" ? null : page.cursor,
					},
				},
			};
		});

		return queryMap;
	}, [skip, query, args, pages]);

	const results = useQueries(queries);

	const pageResults = useMemo(() => {
		const pageData: Array<PageResult | undefined> = [];
		for (let i = 0; i < pages.length; i++) {
			const result = results[`page${i}`];
			if (result instanceof Error) {
				throw result;
			}
			pageData.push(result as PageResult | undefined);
		}
		return pageData;
	}, [results, pages.length]);

	const allItems = useMemo(() => {
		const items: Array<Value> = [];
		for (const pageResult of pageResults) {
			if (pageResult) {
				items.push(...pageResult.page);
			}
		}
		return items;
	}, [pageResults]);

	const lastLoadedPageIndex = useMemo(() => {
		for (let i = pageResults.length - 1; i >= 0; i--) {
			if (pageResults[i] !== undefined) return i;
		}
		return -1;
	}, [pageResults]);

	const lastLoadedResult =
		lastLoadedPageIndex >= 0 ? pageResults[lastLoadedPageIndex] : undefined;
	const firstPageResult = pageResults[0];

	const isLoadingFirstPage = firstPageResult === undefined;
	const isLoadingMore =
		pages.length > 1 &&
		pageResults.some((r, i) => r === undefined && i > 0 && i < pages.length);

	useEffect(() => {
		if (skip || isLoadingFirstPage || isLoadingMore) return;

		const state: PaginationState = {
			pages,
			lastCursor: lastLoadedResult?.continueCursor ?? null,
			isDone: lastLoadedResult?.isDone ?? false,
		};
		setCachedPaginationState(cacheKey, state);
	}, [
		skip,
		cacheKey,
		pages,
		lastLoadedResult,
		isLoadingFirstPage,
		isLoadingMore,
	]);

	const loadMore = useCallback(
		(numItems: number) => {
			if (!lastLoadedResult || lastLoadedResult.isDone) return;

			const nextCursor = lastLoadedResult.continueCursor;
			const alreadyLoading = pages.some((p) => p.cursor === nextCursor);
			if (alreadyLoading) return;

			setPages((prev) => [...prev, { cursor: nextCursor, numItems }]);
		},
		[lastLoadedResult, pages],
	);

	const noopLoadMore = useCallback((_numItems: number) => {}, []);

	const status = useMemo(() => {
		if (isLoadingFirstPage) return "LoadingFirstPage" as const;
		if (isLoadingMore) return "LoadingMore" as const;
		if (lastLoadedResult?.isDone) return "Exhausted" as const;
		return "CanLoadMore" as const;
	}, [isLoadingFirstPage, isLoadingMore, lastLoadedResult]);

	return {
		results: allItems,
		status,
		isLoading: isLoadingFirstPage || isLoadingMore,
		loadMore: status === "CanLoadMore" ? loadMore : noopLoadMore,
	} as UsePaginatedQueryReturnType<Query>;
}
