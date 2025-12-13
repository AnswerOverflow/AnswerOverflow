import type {
	PaginatedQueryArgs,
	PaginatedQueryItem,
	PaginatedQueryReference,
	UsePaginatedQueryReturnType,
} from "convex/react";
import { useEffect, useRef } from "react";
import { usePaginatedQueryWithCursor } from "./use-stable-query";

type UsePaginatedQueryWithFilterOptions = {
	initialNumItems: number;
	targetNumItems: number;
	maxRounds?: number;
};

export function usePaginatedQueryWithFilter<
	Query extends PaginatedQueryReference,
>(
	query: Query,
	args: PaginatedQueryArgs<Query> | "skip",
	options: UsePaginatedQueryWithFilterOptions,
): UsePaginatedQueryReturnType<Query> {
	const { initialNumItems, targetNumItems, maxRounds = 7 } = options;

	const result = usePaginatedQueryWithCursor(query, args, { initialNumItems });

	const roundsRef = useRef(0);
	const prevResultsLengthRef = useRef(0);

	useEffect(() => {
		if (
			result.status === "LoadingFirstPage" ||
			result.status === "LoadingMore"
		) {
			return;
		}

		if (result.results.length !== prevResultsLengthRef.current) {
			prevResultsLengthRef.current = result.results.length;
			roundsRef.current = 0;
		}

		const needsMore =
			result.results.length < targetNumItems &&
			result.status === "CanLoadMore" &&
			roundsRef.current < maxRounds;

		if (needsMore) {
			roundsRef.current += 1;
			result.loadMore(initialNumItems);
		}
	}, [
		result.status,
		result.results.length,
		result.loadMore,
		targetNumItems,
		initialNumItems,
		maxRounds,
	]);

	return result;
}
