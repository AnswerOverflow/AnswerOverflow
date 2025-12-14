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
	useAuthClient,
	useSession,
} from "@packages/ui/components/convex-client-provider";
import { Link } from "@packages/ui/components/link";
import { Effect, Exit } from "effect";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";

const ALLOWED_DEV_ORIGINS = [
	/^http:\/\/localhost(:\d+)?$/,
	/^http:\/\/127\.0\.0\.1(:\d+)?$/,
	/^http:\/\/\[::1\](:\d+)?$/,
];

function isAllowedOrigin(origin: string): boolean {
	return ALLOWED_DEV_ORIGINS.some((pattern) => pattern.test(origin));
}

function isValidState(state: string | null): state is string {
	return (
		typeof state === "string" &&
		state.length === 64 &&
		/^[0-9a-f]+$/.test(state)
	);
}

export default function DevAuthPage() {
	const authClient = useAuthClient();
	const [redirect] = useQueryState("redirect");
	const [state] = useQueryState("state");
	const { data: session, isPending } = useSession({ allowAnonymous: false });
	const redirectUrl = redirect ?? "";
	const [status, setStatus] = useState<
		"idle" | "pending" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string>("");

	const url = Effect.try({
		try: () => new URL(redirectUrl),
		catch: () => {
			return new Error("Invalid redirect URL");
		},
	}).pipe(Effect.runSyncExit);

	const isOriginAllowed =
		Exit.isSuccess(url) && isAllowedOrigin(url.value.origin);

	const isStateValid = isValidState(state);

	useEffect(() => {
		if (isPending) return;
		if (!Exit.isSuccess(url)) return;
		if (!isOriginAllowed) return;
		if (!isStateValid) return;
		if (!session?.user) return;
		if (status !== "idle") return;

		async function sendTokenToOpener() {
			if (!Exit.isSuccess(url)) return;
			if (!state) return;

			setStatus("pending");
			try {
				const response = await fetch(
					`/api/dev/auth/get-jwt?state=${encodeURIComponent(state)}`,
					{
						method: "GET",
						credentials: "include",
					},
				);

				if (!response.ok) {
					const text = await response.text();
					throw new Error(`Failed to get JWT: ${text}`);
				}

				const token = await response.text();

				if (window.opener) {
					window.opener.postMessage(
						{ type: "dev-auth-token", token, redirect: redirectUrl, state },
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
	}, [
		session,
		isPending,
		url,
		redirectUrl,
		status,
		isOriginAllowed,
		isStateValid,
		state,
	]);

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

	if (!isOriginAllowed) {
		return (
			<div className="flex h-[calc(100vh-64px)] items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<p className="text-red-600">
							Origin not allowed. Dev auth is only available for localhost.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!isStateValid) {
		return (
			<div className="flex h-[calc(100vh-64px)] items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<p className="text-red-600">
							Invalid or missing state parameter. This request may have been
							tampered with.
						</p>
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
