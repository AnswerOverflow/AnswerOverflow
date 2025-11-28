"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	anonymousClient,
	oneTimeTokenClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ConvexProvider, ConvexProviderWithAuth } from "convex/react";
import { ConvexReactClient } from "convex/react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

const PROD_AUTH_URL = "https://new.answeroverflow.com";
const DEV_SESSION_KEY = "answeroverflow_dev_session";

const isDevMode =
	typeof window !== "undefined" &&
	process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost");

interface StoredSession {
	token: string;
	expiresAt: string;
}

function getStoredDevSession(): StoredSession | null {
	if (typeof window === "undefined") return null;
	const stored = localStorage.getItem(DEV_SESSION_KEY);
	if (!stored) return null;
	try {
		const session = JSON.parse(stored) as StoredSession;
		if (new Date(session.expiresAt) < new Date()) {
			localStorage.removeItem(DEV_SESSION_KEY);
			return null;
		}
		return session;
	} catch {
		localStorage.removeItem(DEV_SESSION_KEY);
		return null;
	}
}

function storeDevSession(token: string, expiresAt: Date): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(
		DEV_SESSION_KEY,
		JSON.stringify({ token, expiresAt: expiresAt.toISOString() }),
	);
}

function clearDevSession(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(DEV_SESSION_KEY);
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

const devFetch: typeof fetch = (input, init) => {
	const url =
		typeof input === "string"
			? input
			: input instanceof URL
				? input.toString()
				: input.url;
	if (url.startsWith(PROD_AUTH_URL)) {
		const headers = new Headers(init?.headers);
		headers.set("Cookie", "auth-bypass=true");
		return fetch(input, { ...init, headers, credentials: "include" });
	}
	return fetch(input, init);
};

export const authClient = createAuthClient({
	baseURL: isDevMode ? PROD_AUTH_URL : process.env.NEXT_PUBLIC_SITE_URL,
	plugins: [anonymousClient(), convexClient(), oneTimeTokenClient()],
	fetchOptions: isDevMode
		? {
				customFetchImpl: devFetch,
			}
		: undefined,
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
	const [devSession, setDevSession] = useState<StoredSession | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		setDevSession(getStoredDevSession());
		setIsLoading(false);

		const handleSessionUpdate = () => {
			setDevSession(getStoredDevSession());
		};

		window.addEventListener("dev-session-updated", handleSessionUpdate);
		window.addEventListener("storage", handleSessionUpdate);

		return () => {
			window.removeEventListener("dev-session-updated", handleSessionUpdate);
			window.removeEventListener("storage", handleSessionUpdate);
		};
	}, []);

	const clearSession = useCallback(() => {
		clearDevSession();
		setDevSession(null);
		window.dispatchEvent(new Event("dev-session-updated"));
	}, []);

	const storeSession = useCallback((token: string, expiresAt: Date) => {
		storeDevSession(token, expiresAt);
		setDevSession({ token, expiresAt: expiresAt.toISOString() });
		window.dispatchEvent(new Event("dev-session-updated"));
	}, []);

	return {
		devSession,
		isLoading,
		clearSession,
		storeSession,
		isDevMode: isDevMode ?? false,
	};
}

function useDevAuthForConvex(sessionToken: string | null) {
	const [convexToken, setConvexToken] = useState<string | null>(null);

	useEffect(() => {
		if (!sessionToken) {
			setConvexToken(null);
			return;
		}

		const fetchConvexToken = async () => {
			try {
				const response = await devFetch(
					`${PROD_AUTH_URL}/api/auth/convex/token`,
					{
						method: "GET",
						headers: {
							Cookie: `better-auth.session_token=${sessionToken}; auth-bypass=true`,
						},
						credentials: "include",
					},
				);
				if (response.ok) {
					const data = await response.json();
					setConvexToken(data.token);
				}
			} catch (error) {
				console.error("Failed to fetch Convex token:", error);
			}
		};

		fetchConvexToken();
		const interval = setInterval(fetchConvexToken, 50 * 60 * 1000);
		return () => clearInterval(interval);
	}, [sessionToken]);

	const fetchAccessToken = useCallback(async () => {
		return convexToken;
	}, [convexToken]);

	return useMemo(
		() => ({
			isLoading: sessionToken !== null && convexToken === null,
			isAuthenticated: convexToken !== null,
			fetchAccessToken,
		}),
		[sessionToken, convexToken, fetchAccessToken],
	);
}

function DevAuthProvider({
	children,
	sessionToken,
}: {
	children: ReactNode;
	sessionToken: string;
}) {
	const useAuth = useCallback(
		() => useDevAuthForConvex(sessionToken),
		[sessionToken],
	);

	return (
		<ConvexProviderWithAuth client={convex} useAuth={useAuth}>
			{children}
		</ConvexProviderWithAuth>
	);
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	const { devSession, isLoading: devAuthLoading } = useDevAuth();

	if (isDevMode && devAuthLoading) {
		return null;
	}

	if (isDevMode && devSession) {
		return (
			<QueryClientProvider client={queryClient}>
				<ConvexProvider client={convex}>
					<DevAuthProvider sessionToken={devSession.token}>
						{children}
					</DevAuthProvider>
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

export { PROD_AUTH_URL, DEV_SESSION_KEY, storeDevSession, clearDevSession };
