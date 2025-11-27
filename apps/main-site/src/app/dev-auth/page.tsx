"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { authClient } from "@packages/ui/components/convex-client-provider";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";

const ALLOWED_LOCALHOST_PATTERNS = [
	/^http:\/\/localhost:\d+/,
	/^http:\/\/127\.0\.0\.1:\d+/,
];

function isValidDevRedirect(url: string): boolean {
	return ALLOWED_LOCALHOST_PATTERNS.some((pattern) => pattern.test(url));
}

function DevAuthContent() {
	const searchParams = useSearchParams();
	const redirect = searchParams.get("redirect");
	const [error, setError] = useState<string | null>(null);
	const [isRedirecting, setIsRedirecting] = useState(false);
	const session = authClient.useSession();

	useEffect(() => {
		if (!redirect) {
			setError("Missing redirect parameter");
			return;
		}
		if (!isValidDevRedirect(redirect)) {
			setError("Invalid redirect URL - must be localhost");
			return;
		}
	}, [redirect]);

	useEffect(() => {
		if (
			session.data &&
			!session.data.user.isAnonymous &&
			redirect &&
			isValidDevRedirect(redirect) &&
			!isRedirecting
		) {
			setIsRedirecting(true);
			(async () => {
				const { data } = await authClient.convex.token();
				if (data?.token) {
					const url = new URL(redirect);
					const originalPath = url.pathname + url.search;
					url.pathname = "/auth/dev-callback";
					url.search = "";
					url.hash = `token=${data.token}&redirect=${encodeURIComponent(originalPath)}`;
					window.location.href = url.toString();
				} else {
					setError("Failed to generate token");
					setIsRedirecting(false);
				}
			})();
		}
	}, [session.data, redirect, isRedirecting]);

	if (error) {
		return (
			<main className="flex min-h-screen items-center justify-center p-8">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="text-destructive">Error</CardTitle>
						<CardDescription>{error}</CardDescription>
					</CardHeader>
				</Card>
			</main>
		);
	}

	if (session.isPending) {
		return (
			<main className="flex min-h-screen items-center justify-center p-8">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Dev Authentication</CardTitle>
						<CardDescription>Loading session...</CardDescription>
					</CardHeader>
				</Card>
			</main>
		);
	}

	if (!session.data || session.data.user.isAnonymous) {
		return (
			<main className="flex min-h-screen items-center justify-center p-8">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Dev Authentication</CardTitle>
						<CardDescription>
							Sign in to get a development token for localhost. This will
							authenticate your local development environment against production
							data.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							className="w-full"
							onClick={() =>
								authClient.signIn.social({
									provider: "discord",
									callbackURL: window.location.href,
								})
							}
						>
							Sign in with Discord
						</Button>
					</CardContent>
				</Card>
			</main>
		);
	}

	return (
		<main className="flex min-h-screen items-center justify-center p-8">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Dev Authentication</CardTitle>
					<CardDescription>
						Generating token and redirecting to localhost...
					</CardDescription>
				</CardHeader>
			</Card>
		</main>
	);
}

export default function DevAuthPage() {
	return (
		<Suspense
			fallback={
				<main className="flex min-h-screen items-center justify-center p-8">
					<Card className="w-full max-w-md">
						<CardHeader>
							<CardTitle>Dev Authentication</CardTitle>
							<CardDescription>Loading...</CardDescription>
						</CardHeader>
					</Card>
				</main>
			}
		>
			<DevAuthContent />
		</Suspense>
	);
}
