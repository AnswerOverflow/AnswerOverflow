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
export default function DevAuthPage() {
	const searchParams = useSearchParams();
	const { data: session } = useSession({ allowAnonymous: false });
	const redirect = searchParams.get("redirect") ?? "";
	const url = Effect.try({
		try: () => new URL(redirect),
		catch: () => {
			return new Error("Invalid redirect URL");
		},
	}).pipe(Effect.runSyncExit);

	if (!Exit.isSuccess(url)) {
		return <div>Invalid redirect URL</div>;
	}

	const handleAllow = async () => {
		if (session?.user) {
			// redirect to redirect with the session token
			const jwt = await fetch(`/api/dev/auth/get-jwt`, {
				method: "GET",
				headers: {
					Cookie: document.cookie,
				},
			});
			const text = await jwt.text();
			if (jwt.status !== 200) {
				console.error("Failed to get JWT", text);
				return;
			}
			window.location.href = `${url.value.origin}/api/dev/auth/redirect?token=${text}&redirect=${redirect}`;
			return;
		}
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
