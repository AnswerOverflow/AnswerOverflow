"use client";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import {
	authClient,
	useSession,
} from "@packages/ui/components/convex-client-provider";
import { Link } from "@packages/ui/components/link";
import { Effect, Exit } from "effect";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DevAuthPage() {
	const searchParams = useSearchParams();
	const { data: session, isPending } = useSession({ allowAnonymous: false });
	const redirect = searchParams.get("redirect") ?? "";
	const [status, setStatus] = useState<
		"idle" | "pending" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string>("");

	const url = Effect.try({
		try: () => new URL(redirect),
		catch: () => {
			return new Error("Invalid redirect URL");
		},
	}).pipe(Effect.runSyncExit);

	useEffect(() => {
		if (isPending) return;
		if (!Exit.isSuccess(url)) return;
		if (!session?.user) return;
		if (status !== "idle") return;

		async function sendTokenToOpener() {
			if (!Exit.isSuccess(url)) return;

			setStatus("pending");
			try {
				const response = await fetch("/api/dev/auth/get-jwt", {
					method: "GET",
					credentials: "include",
				});

				if (!response.ok) {
					const text = await response.text();
					throw new Error(`Failed to get JWT: ${text}`);
				}

				const token = await response.text();

				if (window.opener) {
					window.opener.postMessage(
						{ type: "dev-auth-token", token, redirect },
						url.value.origin,
					);
					setStatus("success");
					setTimeout(() => window.close(), 1500);
				} else {
					throw new Error(
						"No opener window found. This page should be opened as a popup.",
					);
				}
			} catch (error) {
				setStatus("error");
				setErrorMessage(
					error instanceof Error ? error.message : "Unknown error",
				);
			}
		}

		sendTokenToOpener();
	}, [session, isPending, url, redirect, status]);

	if (!Exit.isSuccess(url)) {
		return (
			<div className="flex h-[calc(100vh-64px)] items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<p className="text-red-600">Invalid redirect URL</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const handleAllow = async () => {
		await authClient.signIn.social({
			provider: "discord",
			callbackURL: window.location.href,
		});
	};

	if (session?.user) {
		return (
			<div className="flex h-[calc(100vh-64px)] items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="text-xl leading-snug">
							Authenticating...
						</CardTitle>
					</CardHeader>
					<CardContent>
						{status === "pending" && (
							<p className="text-muted-foreground">
								Sending authentication token to {url.value.host}...
							</p>
						)}
						{status === "success" && (
							<p className="text-green-600">
								Authentication successful! This window will close automatically.
							</p>
						)}
						{status === "error" && (
							<p className="text-red-600">Error: {errorMessage}</p>
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex h-[calc(100vh-64px)] items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
						Recommended for developers only
					</div>
					<CardTitle className="text-xl leading-snug">
						Sign in to your account on {url.value.host}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						After you sign in, your session will be shared with {url.value.host}
					</p>
				</CardContent>
				<CardFooter className="flex justify-end gap-4">
					<Button asChild>
						<Link href="/">Cancel</Link>
					</Button>
					<Button variant="outline" onClick={handleAllow}>
						I know what I'm doing, continue
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
