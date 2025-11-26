import { useConvexAuth, usePaginatedQuery, useQuery } from "convex/react";
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

/**
 * Hook that waits for authentication before returning true.
 * Used to skip queries until auth is ready.
 */
export function useIsAuthReady() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	return !isLoading && isAuthenticated;
}

/**
 * Drop-in replacement for usePaginatedQuery for use with a parametrized query.
 * Unlike usePaginatedQuery, when query arguments change useStablePaginatedQuery
 * does not return empty results and 'LoadingMore' status. Instead, it continues
 * to return the previously loaded results until the new results have finished
 * loading.
 *
 * @param name - string naming the query function
 * @param args - arguments to be passed to the query function
 * @param options - pagination options including initialNumItems
 * @returns UsePaginatedQueryResult
 */
export const useStablePaginatedQuery = ((name, args, options) => {
	const result = usePaginatedQuery(name, args, options);
	const stored = useRef(result);

	if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
		stored.current = result;
	}

	return stored.current;
}) as typeof usePaginatedQuery;

/**
 * Authenticated version of useStablePaginatedQuery.
 * Waits for authentication before making queries to avoid "Not authenticated" errors.
 */
export const useAuthenticatedStablePaginatedQuery = ((name, args, options) => {
	const isAuthReady = useIsAuthReady();
	const result = usePaginatedQuery(name, isAuthReady ? args : "skip", options);
	const stored = useRef(result);

	if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
		stored.current = result;
	}

	return stored.current;
}) as typeof usePaginatedQuery;
