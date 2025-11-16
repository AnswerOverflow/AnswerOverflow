"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAuthClient } from "better-auth/react";
import {
	ConvexProvider,
	ConvexProviderWithAuth,
	ConvexReactClient,
} from "convex/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type AnonymousTokenCache = {
	token: string;
	expiresAt: number;
};

function useHybridAuth() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const [anonymousTokenCache, setAnonymousTokenCache] =
		useState<AnonymousTokenCache | null>(null);
	const [isFetchingAnonymousToken, setIsFetchingAnonymousToken] =
		useState(false);
	const fetchPromiseRef = useRef<Promise<string | null> | null>(null);

	const fetchAnonymousToken = useCallback(async (): Promise<string | null> => {
		if (fetchPromiseRef.current) {
			return fetchPromiseRef.current;
		}

		const promise = (async () => {
			try {
				setIsFetchingAnonymousToken(true);
				const response = await fetch("/api/auth/anonymous-session");
				if (!response.ok) {
					return null;
				}
				const data = (await response.json()) as {
					token: string;
					sessionId: string;
					expiresAt: number;
				};
				setAnonymousTokenCache({
					token: data.token,
					expiresAt: data.expiresAt,
				});
				return data.token;
			} catch {
				return null;
			} finally {
				setIsFetchingAnonymousToken(false);
				fetchPromiseRef.current = null;
			}
		})();

		fetchPromiseRef.current = promise;
		return promise;
	}, []);

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

			const now = Date.now();
			const bufferTime = 30 * 1000;

			if (
				anonymousTokenCache &&
				anonymousTokenCache.expiresAt > now + bufferTime
			) {
				console.log("Using cached anonymous token");
				return anonymousTokenCache.token;
			}

			console.log("Fetching new anonymous token");
			const token = await fetchAnonymousToken();
			console.log("Fetched anonymous token:", token ? "success" : "failed");
			return token;
		},
		[session, anonymousTokenCache, fetchAnonymousToken],
	);

	useEffect(() => {
		if (!session && !anonymousTokenCache && !isFetchingAnonymousToken) {
			fetchAnonymousToken();
		}
	}, [
		session,
		anonymousTokenCache,
		isFetchingAnonymousToken,
		fetchAnonymousToken,
	]);

	return useMemo(
		() => ({
			isLoading: isSessionPending || (!session && !anonymousTokenCache),
			isAuthenticated: session !== null || anonymousTokenCache !== null,
			fetchAccessToken,
		}),
		[isSessionPending, session, anonymousTokenCache, fetchAccessToken],
	);
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	return (
		<ConvexProvider client={convex}>
			<ConvexProviderWithAuth client={convex} useAuth={useHybridAuth}>
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			</ConvexProviderWithAuth>
		</ConvexProvider>
	);
}
