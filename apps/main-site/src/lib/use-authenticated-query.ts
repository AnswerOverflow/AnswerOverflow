import { useSession } from "@packages/ui/components/convex-client-provider";
import { useSafeStableQuery } from "@packages/ui/hooks/use-stable-query";
import type { FunctionReference } from "convex/server";

export function useAuthenticatedQuery<
	Query extends FunctionReference<"query">,
	Args extends Query["_args"],
>(query: Query, args: Args): Query["_returnType"] | undefined {
	const session = useSession();

	const result = useSafeStableQuery(
		query,
		session?.data ? args : ("skip" as const),
	);

	if (result.error) {
		console.error("Query error:", result.error);
		return undefined;
	}

	return result.data;
}
