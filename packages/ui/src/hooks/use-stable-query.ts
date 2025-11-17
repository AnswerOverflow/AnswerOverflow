import { usePaginatedQuery, useQuery } from "convex/react";
import { useRef } from "react";

/**
 * Drop-in replacement for useQuery intended to be used with a parametrized query.
 * Unlike useQuery, useStableQuery does not return undefined while loading new
 * data when the query arguments change, but instead will continue to return
 * the previously loaded data until the new data has finished loading.
 *
 * See https://stack.convex.dev/help-my-app-is-overreacting for details.
 *
 * @param name - string naming the query function
 * @param ...args - arguments to be passed to the query function
 * @returns UseQueryResult
 */
export const useStableQuery = ((name, ...args) => {
	const result = useQuery(name, ...args);
	const stored = useRef(result); // ref objects are stable between rerenders

	// result is only undefined while data is loading
	// if a freshly loaded result is available, use the ref to store it
	if (result !== undefined) {
		stored.current = result;
	}

	// undefined on first load, stale data while loading, fresh data after loading
	return stored.current;
}) as typeof useQuery;

/**
 * Drop-in replacement for usePaginatedQuery for use with a parametrized query.
 * Unlike usePaginatedQuery, when query arguments change useStablePaginatedQuery
 * does not return empty results and 'LoadingMore' status. Instead, it continues
 * to return the previously loaded results until the new results have finished
 * loading.
 *
 * See https://stack.convex.dev/help-my-app-is-overreacting for details.
 *
 * @param name - string naming the query function
 * @param ...args - arguments to be passed to the query function
 * @returns UsePaginatedQueryResult
 */
export const useStablePaginatedQuery = ((name, ...args) => {
	const result = usePaginatedQuery(name, ...args);
	const stored = useRef(result); // ref objects are stable between rerenders

	// If data is still loading, wait and do nothing
	// If data has finished loading, store the result
	if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
		stored.current = result;
	}

	return stored.current;
}) as typeof usePaginatedQuery;
