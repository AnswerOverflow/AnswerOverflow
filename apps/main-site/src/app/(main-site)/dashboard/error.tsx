"use client";

import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { AlertTriangle, LogIn, RefreshCw } from "lucide-react";
import { useAuthClient } from "../../../lib/auth-client";

export default function DashboardError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const authClient = useAuthClient();
	const isDev = process.env.NODE_ENV === "development";

	return (
		<div className="flex min-h-[50vh] items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10">
						<AlertTriangle className="size-6 text-destructive" />
					</div>
					<CardTitle className="text-xl">Something went wrong</CardTitle>
					<CardDescription>
						Your session may have expired. Please sign in again to continue.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isDev && error.message && (
						<div className="rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
							<p className="mb-1 font-semibold">Error:</p>
							<p className="break-all">{error.message}</p>
							{error.digest && (
								<p className="mt-2 text-[10px] opacity-70">
									Digest: {error.digest}
								</p>
							)}
						</div>
					)}
					{!isDev && error.digest && (
						<p className="text-center text-xs text-muted-foreground">
							Error ID: {error.digest}
						</p>
					)}
				</CardContent>
				<CardFooter className="flex justify-center gap-2">
					<Button variant="outline" onClick={reset}>
						<RefreshCw className="size-4" />
						Try Again
					</Button>
					<Button
						variant="default"
						onClick={async () => {
							await authClient.signIn.social({
								provider: "discord",
								callbackURL: window.location.href,
							});
						}}
					>
						<LogIn className="size-4" />
						Sign In Again
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
