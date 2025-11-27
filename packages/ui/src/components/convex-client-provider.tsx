"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import {
	ConvexProvider,
	ConvexProviderWithAuth,
	ConvexReactClient,
} from "convex/react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

export const DEV_TOKEN_KEY = "answeroverflow_dev_token";

const isDevMode =
	typeof window !== "undefined" &&
	process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost");

function getDevToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(DEV_TOKEN_KEY);
}

function clearDevToken(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(DEV_TOKEN_KEY);
}

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
	baseURL: process.env.NEXT_PUBLIC_SITE_URL,
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

export function useDevAuth() {
	const [devToken, setDevToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const token = getDevToken();
		setDevToken(token);
		setIsLoading(false);

		const handleTokenUpdate = () => {
			setDevToken(getDevToken());
		};

		window.addEventListener("dev-token-updated", handleTokenUpdate);
		window.addEventListener("storage", handleTokenUpdate);

		return () => {
			window.removeEventListener("dev-token-updated", handleTokenUpdate);
			window.removeEventListener("storage", handleTokenUpdate);
		};
	}, []);

	const clearToken = useCallback(() => {
		clearDevToken();
		setDevToken(null);
		window.dispatchEvent(new Event("dev-token-updated"));
	}, []);

	return { devToken, isLoading, clearToken, isDevMode: isDevMode ?? false };
}

function useDevAuthForConvex(devToken: string | null) {
	const fetchAccessToken = useCallback(async () => {
		return devToken;
	}, [devToken]);

	return useMemo(
		() => ({
			isLoading: false,
			isAuthenticated: devToken !== null,
			fetchAccessToken,
		}),
		[devToken, fetchAccessToken],
	);
}

function DevAuthProvider({
	children,
	devToken,
}: {
	children: ReactNode;
	devToken: string;
}) {
	const useAuth = useCallback(() => useDevAuthForConvex(devToken), [devToken]);

	return (
		<ConvexProviderWithAuth client={convex} useAuth={useAuth}>
			{children}
		</ConvexProviderWithAuth>
	);
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	const { devToken, isLoading: devAuthLoading } = useDevAuth();

	if (devAuthLoading) {
		return null;
	}

	if (isDevMode && devToken) {
		return (
			<QueryClientProvider client={queryClient}>
				<ConvexProvider client={convex}>
					<DevAuthProvider devToken={devToken}>{children}</DevAuthProvider>
				</ConvexProvider>
			</QueryClientProvider>
		);
	}

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
