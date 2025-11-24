import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";

export function useAuthenticatedQuery<
	Query extends FunctionReference<"query">,
	Args extends Query["_args"],
>(query: Query, args: Args): Query["_returnType"] | undefined {
	const { isAuthenticated } = useConvexAuth();

	return useQuery(query, isAuthenticated ? args : ("skip" as const));
}
