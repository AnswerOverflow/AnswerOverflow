"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import {
	PROD_AUTH_URL,
	storeDevSession,
} from "@packages/ui/components/convex-client-provider";

function DevCallbackContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		const ott = searchParams.get("ott");
		const redirect = searchParams.get("redirect") || "/dashboard";

		if (!ott) {
			setError("No one-time-token found in URL");
			return;
		}

		if (isProcessing) return;
		setIsProcessing(true);

		const verifyToken = async () => {
			try {
				const response = await fetch(
					`${PROD_AUTH_URL}/api/auth/one-time-token/verify`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Cookie: "auth-bypass=true",
						},
						credentials: "include",
						body: JSON.stringify({ token: ott }),
					},
				);

				if (!response.ok) {
					const text = await response.text();
					throw new Error(`Failed to verify token: ${text}`);
				}

				const data = await response.json();

				if (data.session?.token && data.session?.expiresAt) {
					storeDevSession(data.session.token, new Date(data.session.expiresAt));
					window.dispatchEvent(new Event("dev-session-updated"));
					router.push(redirect);
				} else {
					throw new Error("Invalid session response");
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to verify token");
			}
		};

		verifyToken();
	}, [searchParams, router, isProcessing]);

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

	return (
		<main className="flex min-h-screen items-center justify-center p-8">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Processing Authentication</CardTitle>
					<CardDescription>Verifying token and redirecting...</CardDescription>
				</CardHeader>
			</Card>
		</main>
	);
}

export default function DevCallbackPage() {
	return (
		<Suspense
			fallback={
				<main className="flex min-h-screen items-center justify-center p-8">
					<Card className="w-full max-w-md">
						<CardHeader>
							<CardTitle>Loading...</CardTitle>
						</CardHeader>
					</Card>
				</main>
			}
		>
			<DevCallbackContent />
		</Suspense>
	);
}
