"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";

const DEV_TOKEN_KEY = "answeroverflow_dev_token";

export default function DevCallbackPage() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const hash = window.location.hash;
		if (!hash || !hash.startsWith("#token=")) {
			setError("No token found in URL");
			return;
		}

		const params = new URLSearchParams(hash.slice(1));
		const token = params.get("token");
		const redirect = params.get("redirect") || "/dashboard";

		if (!token) {
			setError("Invalid token");
			return;
		}

		localStorage.setItem(DEV_TOKEN_KEY, token);
		window.dispatchEvent(new Event("dev-token-updated"));
		window.location.hash = "";
		router.push(redirect);
	}, [router]);

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
					<CardDescription>Storing token and redirecting...</CardDescription>
				</CardHeader>
			</Card>
		</main>
	);
}
