"use client";

import {
	convexClient,
	crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { adminClient, anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { buildUrl, type UrlTenant } from "../utils/links";

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

function createAuthClientInstance(baseURL: string | undefined) {
	return createAuthClient({
		baseURL,
		plugins: [
			anonymousClient(),
			convexClient(),
			crossDomainClient(),
			adminClient(),
		],
	});
}

type AuthClient = ReturnType<typeof createAuthClientInstance>;

const authClientCache = new Map<string, AuthClient>();

function getOrCreateAuthClient(tenant: UrlTenant | undefined): AuthClient {
	const baseURL = tenant ? buildUrl(tenant, "/api/auth/") : undefined;
	const cacheKey = baseURL ?? "__default__";

	const existing = authClientCache.get(cacheKey);
	if (existing) {
		return existing;
	}

	const client = createAuthClientInstance(baseURL);
	authClientCache.set(cacheKey, client);
	return client;
}

const AuthClientContext = createContext<AuthClient | null>(null);

function AuthClientProvider({
	children,
	tenant,
}: {
	children: ReactNode;
	tenant: UrlTenant | undefined;
}) {
	const authClient = useMemo(() => getOrCreateAuthClient(tenant), [tenant]);
	return (
		<AuthClientContext.Provider value={authClient}>
			<ConvexBetterAuthProvider client={convex} authClient={authClient}>
				{children}
			</ConvexBetterAuthProvider>
		</AuthClientContext.Provider>
	);
}

export function useAuthClient() {
	const authClient = useContext(AuthClientContext);
	if (!authClient) {
		throw new Error("useAuthClient must be used within an AuthClientProvider");
	}
	return authClient;
}

export const useSession = (
	props: { allowAnonymous?: boolean } = { allowAnonymous: true },
) => {
	const authClient = useAuthClient();
	const session = authClient.useSession();
	const isAnonymousUser = session?.data?.user?.isAnonymous ?? false;
	const shouldHideData = !props.allowAnonymous && isAnonymousUser;

	return useMemo(() => {
		if (shouldHideData) {
			return {
				...session,
				data: null,
			};
		}
		return session;
	}, [session, shouldHideData]);
};

export const useNonAnonymousSession = () => {
	return useSession({ allowAnonymous: false });
};

export function ConvexClientProvider({
	children,
	tenant,
}: {
	children: ReactNode;
	tenant: UrlTenant | undefined;
}) {
	return (
		<QueryClientProvider client={queryClient}>
			<ConvexProvider client={convex}>
				<ConvexQueryCacheProvider>
					<AuthClientProvider tenant={tenant}>{children}</AuthClientProvider>
				</ConvexQueryCacheProvider>
			</ConvexProvider>
		</QueryClientProvider>
	);
}
