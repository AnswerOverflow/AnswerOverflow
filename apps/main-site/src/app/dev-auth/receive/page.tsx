"use client";

import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Link } from "@packages/ui/components/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const MAIN_SITE_ORIGIN = "https://new.answeroverflow.com";

export default function DevAuthReceivePage() {
	const searchParams = useSearchParams();
	const redirect = searchParams.get("redirect") ?? "/";
	const [status, setStatus] = useState<
		"idle" | "pending" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string>("");

	const [processing, setProcessing] = useState(false);

	const handleMessage = useCallback(
		async (event: MessageEvent) => {
			if (event.origin !== MAIN_SITE_ORIGIN) return;
			if (event.data?.type !== "dev-auth-token") return;
			if (processing) return;

			const token = event.data.token;

			if (!token) {
				setStatus("error");
				setErrorMessage("No token received from authentication popup");
				return;
			}

			setProcessing(true);

			try {
				const response = await fetch("/api/dev/auth/set-token", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ token }),
					credentials: "include",
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error ?? "Failed to set authentication token");
				}

				setStatus("success");
				setTimeout(() => {
					window.location.href = redirect;
				}, 1000);
			} catch (error) {
				setStatus("error");
				setErrorMessage(
					error instanceof Error ? error.message : "Unknown error",
				);
				setProcessing(false);
			}
		},
		[redirect, processing],
	);

	useEffect(() => {
		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [handleMessage]);

	const handleOpenPopup = () => {
		setStatus("pending");
		const callbackUrl = `${MAIN_SITE_ORIGIN}/dev-auth?redirect=${encodeURIComponent(window.location.origin + redirect)}`;
		const popup = window.open(
			callbackUrl,
			"dev-auth-popup",
			"width=500,height=600,popup=true",
		);

		if (!popup) {
			setStatus("error");
			setErrorMessage(
				"Failed to open popup. Please allow popups for this site.",
			);
			return;
		}

		const checkClosed = setInterval(() => {
			if (popup.closed) {
				clearInterval(checkClosed);
				if (status === "pending") {
					setStatus("idle");
				}
			}
		}, 500);
	};

	return (
		<div className="flex h-[calc(100vh-64px)] items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
						Development Authentication
					</div>
					<CardTitle className="text-xl leading-snug">
						Sign in with Answer Overflow
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						This will open a popup to authenticate with Answer Overflow. After
						signing in, you will be redirected back here.
					</p>
					{status === "pending" && (
						<p className="mt-4 text-sm text-yellow-600">
							Waiting for authentication...
						</p>
					)}
					{status === "success" && (
						<p className="mt-4 text-sm text-green-600">
							Authentication successful! Redirecting...
						</p>
					)}
					{status === "error" && (
						<p className="mt-4 text-sm text-red-600">Error: {errorMessage}</p>
					)}
				</CardContent>
				<CardFooter className="flex justify-end gap-4">
					<Button asChild variant="outline">
						<Link href="/">Cancel</Link>
					</Button>
					<Button
						onClick={handleOpenPopup}
						disabled={status === "pending" || status === "success"}
					>
						{status === "pending"
							? "Authenticating..."
							: "Sign in with Answer Overflow"}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
