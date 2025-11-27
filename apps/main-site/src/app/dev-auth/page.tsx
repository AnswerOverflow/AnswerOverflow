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
	const { data: session } = useSession({ allowAnonymous: false });
	const redirect = searchParams.get("redirect") ?? "";
	const ott = searchParams.get("ott");
	const [isVerifying, setIsVerifying] = useState(false);

	const url = Effect.try({
		try: () => new URL(redirect),
		catch: () => {
			return new Error("Invalid redirect URL");
		},
	}).pipe(Effect.runSyncExit);

	useEffect(() => {
		const handleOTT = async () => {
			if (!ott || !Exit.isSuccess(url)) return;

			setIsVerifying(true);

			await new Promise((resolve) => setTimeout(resolve, 1000));

			const cookie = authClient.getCookie();

			const redirectUrl = new URL(url.value);
			redirectUrl.searchParams.set("auth-cookie", encodeURIComponent(cookie));

			window.location.href = redirectUrl.toString();
		};

		void handleOTT();
	}, [ott, url]);

	useEffect(() => {
		const handleRedirectIfSignedIn = () => {
			if (!session || !Exit.isSuccess(url) || ott) return;

			const cookie = authClient.getCookie();

			const redirectUrl = new URL(url.value);
			redirectUrl.searchParams.set("auth-cookie", encodeURIComponent(cookie));

			window.location.href = redirectUrl.toString();
		};

		handleRedirectIfSignedIn();
	}, [session, url, ott]);

	if (!Exit.isSuccess(url)) {
		return <div>Invalid redirect URL</div>;
	}

	if (isVerifying || (session && !ott)) {
		return (
			<div className="flex h-[calc(100vh-64px)] items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="text-xl leading-snug">
							Completing sign in...
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Please wait while we redirect you to {url.value.href}
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
						After you sign in you will be redirected to {url.value.href}
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
