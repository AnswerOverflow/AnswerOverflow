"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
	expectAuth: false,
	unsavedChangesWarning: false,
});
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			queryKeyHashFn: convexQueryClient.hashFn(),
			queryFn: convexQueryClient.queryFn(),
		},
	},
});

convexQueryClient.connect(queryClient);

export const authClient = createAuthClient({
	plugins: [anonymousClient(), convexClient()],
});

export const useSession = (
	props: { allowAnonymous?: boolean } = { allowAnonymous: true },
) => {
	const session = authClient.useSession();
	if (!props.allowAnonymous && session?.data?.user?.isAnonymous) {
		return {
			...session,
			data: null,
		};
	}
	return session;
};

export const useNonAnonymousSession = () => {
	return useSession({ allowAnonymous: false });
};

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<ConvexProvider client={convex}>
				<ConvexBetterAuthProvider client={convex} authClient={authClient}>
					{children}
				</ConvexBetterAuthProvider>
			</ConvexProvider>
		</QueryClientProvider>
	);
}
