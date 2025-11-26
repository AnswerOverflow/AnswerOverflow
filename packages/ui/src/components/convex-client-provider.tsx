"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { ConvexQueryClient } from "@convex-dev/react-query";
import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import { createAuthClient } from "better-auth/react";
import {
	ConvexProvider,
	ConvexProviderWithAuth,
	ConvexReactClient,
} from "convex/react";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";

// biome-ignore lint/style/noNonNullAssertion: Setup
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
	expectAuth: false,
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
	plugins: [convexClient()],
});

type AnonymousTokenResponse = {
	token: string;
	sessionId: string;
	expiresAt: number;
};

function useHybridAuth() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();

	const { data: anonymousTokenData, isPending: isAnonymousTokenPending } =
		useQuery({
			queryKey: ["anonymous-session"],
			queryFn: async (): Promise<AnonymousTokenResponse | null> => {
				const response = await fetch("/api/auth/anonymous-session");
				if (!response.ok) {
					return null;
				}
				return (await response.json()) as AnonymousTokenResponse;
			},
			enabled: !session,
			staleTime: (query) => {
				const data = query.state.data;
				if (!data) return 0;
				const now = Date.now();
				const bufferTime = 30 * 1000;
				const timeUntilExpiry = data.expiresAt - now - bufferTime;
				return Math.max(0, timeUntilExpiry);
			},
			gcTime: Infinity,
			retry: false,
		});

	const fetchAccessToken = useCallback(
		async (_args: { forceRefreshToken: boolean }) => {
			if (session) {
				try {
					const { data } = await authClient.convex.token();
					return data?.token || null;
				} catch {
					return null;
				}
			}

			return anonymousTokenData?.token || null;
		},
		[session, anonymousTokenData],
	);

	return useMemo(
		() => ({
			isLoading: isSessionPending || (!session && isAnonymousTokenPending),
			isAuthenticated: session !== null || anonymousTokenData !== null,
			fetchAccessToken,
		}),
		[
			isSessionPending,
			session,
			isAnonymousTokenPending,
			anonymousTokenData,
			fetchAccessToken,
		],
	);
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<ConvexProvider client={convex}>
				<ConvexProviderWithAuth client={convex} useAuth={useHybridAuth}>
					{children}
				</ConvexProviderWithAuth>
			</ConvexProvider>
		</QueryClientProvider>
	);
}
