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
	const stored = useRef(result);

	if (result !== undefined) {
		stored.current = result;
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
