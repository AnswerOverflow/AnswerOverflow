import type {
	PaginatedQueryArgs,
	PaginatedQueryItem,
	PaginatedQueryReference,
	UsePaginatedQueryReturnType,
} from "convex/react";
import { usePaginatedQuery, useQueries, type useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import { convexToJson, type Value } from "convex/values";
import { makeUseQueryWithStatus } from "convex-helpers/react";
import {
	useCallback,
	useEffect,
	useEffectEvent,
	useMemo,
	useRef,
	useState,
} from "react";

import { useDelayedSubscription } from "./use-delayed-subscription";

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

type PageResult<Query extends PaginatedQueryReference> = {
	page: Array<PaginatedQueryItem<Query>>;
	isDone: boolean;
	continueCursor: string;
};

type PaginatedQueryOptions<Query extends PaginatedQueryReference> = {
	initialNumItems: number;
	initialCursor?: string | null;
	initialData?: PageResult<Query>;
};

export function usePaginatedQueryWithCursor<
	Query extends PaginatedQueryReference,
>(
	query: Query,
	args: PaginatedQueryArgs<Query> | "skip",
	options: PaginatedQueryOptions<Query>,
): UsePaginatedQueryReturnType<Query> {
	const { initialNumItems, initialCursor = null, initialData } = options;
	const skip = args === "skip";

	const argsKey = skip
		? "skip"
		: JSON.stringify(convexToJson(args as Record<string, Value>));

	const [additionalPages, setAdditionalPages] = useState<
		Array<{ cursor: string; numItems: number }>
	>([]);

	const { shouldSkip: shouldSkipInitialPage, forceEnable } =
		useDelayedSubscription({
			hasInitialData: initialData !== undefined,
		});

	const prevArgsKeyRef = useRef(argsKey);
	const hasInitializedRef = useRef(false);

	const onArgsChange = useEffectEvent(
		(newArgsKey: string, prevArgsKey: string) => {
			const wasSkip = prevArgsKey === "skip";
			setAdditionalPages([]);

			if (!wasSkip && newArgsKey !== "skip" && hasInitializedRef.current) {
				forceEnable();
			}

			if (newArgsKey !== "skip") {
				hasInitializedRef.current = true;
			}
		},
	);

	useEffect(() => {
		if (prevArgsKeyRef.current !== argsKey) {
			onArgsChange(argsKey, prevArgsKeyRef.current);
			prevArgsKeyRef.current = argsKey;
		}
	}, [argsKey]);

	const queries = useMemo(() => {
		if (skip) {
			return {};
		}

		const queryMap: Record<
			string,
			{ query: FunctionReference<"query">; args: Record<string, Value> }
		> = {};

		if (!shouldSkipInitialPage) {
			queryMap.page0 = {
				query: query as FunctionReference<"query">,
				args: {
					...(args as Record<string, Value>),
					paginationOpts: {
						numItems: initialNumItems,
						cursor: initialCursor,
					},
				},
			};
		}

		additionalPages.forEach((page, index) => {
			const pageKey = shouldSkipInitialPage
				? `page${index}`
				: `page${index + 1}`;
			queryMap[pageKey] = {
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
	}, [
		skip,
		query,
		args,
		initialNumItems,
		initialCursor,
		additionalPages,
		shouldSkipInitialPage,
	]);

	const results = useQueries(queries);

	const pageResults = useMemo(() => {
		const pages: Array<PageResult<Query> | undefined> = [];

		if (shouldSkipInitialPage && initialData) {
			pages.push(initialData);
			for (let i = 0; i < additionalPages.length; i++) {
				const result = results[`page${i}`];
				if (result instanceof Error) {
					throw result;
				}
				pages.push(result as PageResult<Query> | undefined);
			}
		} else {
			const totalPages = 1 + additionalPages.length;
			for (let i = 0; i < totalPages; i++) {
				const result = results[`page${i}`];
				if (result instanceof Error) {
					throw result;
				}
				if (i === 0 && result === undefined && initialData) {
					pages.push(initialData);
				} else {
					pages.push(result as PageResult<Query> | undefined);
				}
			}
		}

		return pages;
	}, [results, additionalPages.length, shouldSkipInitialPage, initialData]);

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

			forceEnable();

			setAdditionalPages((prev) => [
				...prev,
				{ cursor: lastLoadedResult.continueCursor, numItems },
			]);
		},
		[lastLoadedResult, additionalPages, forceEnable],
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
