"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { getTenantCanonicalUrl, type TenantInfo } from "../utils/links";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
	expectAuth: true,
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

function createAuthClientWithBaseURL(tenant: TenantInfo | null | undefined) {
	const baseURL = tenant
		? getTenantCanonicalUrl(tenant, "/api/auth/")
		: undefined;
	return createAuthClient({
		baseURL,
		plugins: [anonymousClient(), convexClient()],
	});
}

type AuthClient = ReturnType<typeof createAuthClientWithBaseURL>;

const AuthClientContext = createContext<AuthClient | null>(null);
const authClient = createAuthClientWithBaseURL(null);
function AuthClientProvider({
	children,
	tenant,
}: {
	children: ReactNode;
	tenant: TenantInfo | null | undefined;
}) {
	// const [authClient] = useState(() => createAuthClientWithBaseURL(tenant));
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
	tenant: TenantInfo | null | undefined;
}) {
	return (
		<QueryClientProvider client={queryClient}>
			<ConvexProvider client={convex}>
				<AuthClientProvider tenant={tenant}>{children}</AuthClientProvider>
			</ConvexProvider>
		</QueryClientProvider>
	);
}
