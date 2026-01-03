import { useSession } from "@packages/ui/components/convex-client-provider";
import { useStableQuery } from "@packages/ui/hooks/use-stable-query";
import type { FunctionReference } from "convex/server";

export function useAuthenticatedQuery<
	Query extends FunctionReference<"query">,
	Args extends Query["_args"],
>(query: Query, args: Args | "skip"): Query["_returnType"] | undefined {
	const session = useSession({ allowAnonymous: false });

	return useStableQuery(
		query,
		session?.data && args !== "skip" ? args : ("skip" as const),
	);
}
