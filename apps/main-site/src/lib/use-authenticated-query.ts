import { useSession } from "@packages/ui/components/convex-client-provider";
import {
	useQueryWithStatus,
	useStableQuery,
} from "@packages/ui/hooks/use-stable-query";
import type { FunctionReference } from "convex/server";

export function useAuthenticatedQuery<
	Query extends FunctionReference<"query">,
	Args extends Query["_args"],
>(
	query: Query,
	args: Args | "skip",
	options: { allowAnonymous?: boolean } = { allowAnonymous: false },
): Query["_returnType"] | undefined {
	const session = useSession({ allowAnonymous: options.allowAnonymous });

	return useStableQuery(
		query,
		session?.data && args !== "skip" ? args : ("skip" as const),
	);
}

export function useAuthenticatedQueryWithStatus<
	Query extends FunctionReference<"query">,
	Args extends Query["_args"],
>(
	query: Query,
	args: Args | "skip",
	options: { allowAnonymous?: boolean } = { allowAnonymous: false },
): {
	data: Query["_returnType"] | undefined;
	isLoading: boolean;
	error: Error | undefined;
	isSessionPending: boolean;
	isAuthenticated: boolean;
} {
	const session = useSession({ allowAnonymous: options.allowAnonymous });
	const isSessionPending = session?.isPending ?? true;
	const isAuthenticated = !!session?.data;

	const shouldSkip = !session?.data || args === "skip";
	const result = useQueryWithStatus(
		query,
		...(shouldSkip ? ["skip" as const] : [args]),
	);

	return {
		data: result.isSuccess ? result.data : undefined,
		isLoading: result.isPending,
		error: result.isError ? result.error : undefined,
		isSessionPending,
		isAuthenticated,
	};
}
