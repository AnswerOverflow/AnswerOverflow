import type {
	PaginatedQueryArgs,
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

	const totalRoundsRef = useRef(0);
	const prevResultsLengthRef = useRef(0);
	const consecutiveEmptyRoundsRef = useRef(0);

	useEffect(() => {
		if (
			result.status === "LoadingFirstPage" ||
			result.status === "LoadingMore"
		) {
			return;
		}

		const currentLength = result.results.length;
		const prevLength = prevResultsLengthRef.current;
		const gotNewResults = currentLength > prevLength;

		if (gotNewResults) {
			consecutiveEmptyRoundsRef.current = 0;
		} else if (totalRoundsRef.current > 0) {
			consecutiveEmptyRoundsRef.current += 1;
		}

		prevResultsLengthRef.current = currentLength;

		const hasEnoughResults = currentLength >= targetNumItems;
		const exhaustedData = result.status !== "CanLoadMore";
		const hitMaxRounds = totalRoundsRef.current >= maxRounds;
		const tooManyEmptyRounds = consecutiveEmptyRoundsRef.current >= 3;

		if (
			hasEnoughResults ||
			exhaustedData ||
			hitMaxRounds ||
			tooManyEmptyRounds
		) {
			return;
		}

		totalRoundsRef.current += 1;
		result.loadMore(initialNumItems);
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
