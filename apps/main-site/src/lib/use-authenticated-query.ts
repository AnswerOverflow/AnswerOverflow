import { useSession } from "@packages/ui/components/convex-client-provider";
import { useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";

export function useAuthenticatedQuery<
	Query extends FunctionReference<"query">,
	Args extends Query["_args"],
>(query: Query, args: Args): Query["_returnType"] | undefined {
	const session = useSession();

	return useQuery(query, session?.data ? args : ("skip" as const));
}
