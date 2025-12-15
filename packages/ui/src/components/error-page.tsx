"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Button } from "./button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./card";

type ErrorPageProps = {
	error: Error & { digest?: string };
	reset: () => void;
	homeHref?: string;
};

export function ErrorPage({ error, reset, homeHref = "/" }: ErrorPageProps) {
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
						An unexpected error occurred. Please try again.
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
					<Button variant="default" asChild>
						<a href={homeHref}>
							<Home className="size-4" />
							Go Home
						</a>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}

type GlobalErrorPageProps = {
	error: Error & { digest?: string };
	reset: () => void;
};

export function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
	const isDev = process.env.NODE_ENV === "development";

	return (
		<html lang="en">
			<body>
				<div
					style={{
						display: "flex",
						minHeight: "100vh",
						alignItems: "center",
						justifyContent: "center",
						padding: "1rem",
						fontFamily:
							'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
						backgroundColor: "#0a0a0a",
						color: "#fafafa",
					}}
				>
					<div
						style={{
							width: "100%",
							maxWidth: "28rem",
							borderRadius: "0.75rem",
							border: "1px solid #27272a",
							backgroundColor: "#18181b",
							padding: "1.5rem",
							boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
						}}
					>
						<div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
							<div
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									width: "3rem",
									height: "3rem",
									borderRadius: "50%",
									backgroundColor: "rgba(239, 68, 68, 0.1)",
									marginBottom: "0.75rem",
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#ef4444"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
									<path d="M12 9v4" />
									<path d="M12 17h.01" />
								</svg>
							</div>
							<h1
								style={{
									fontSize: "1.25rem",
									fontWeight: 600,
									margin: "0 0 0.5rem 0",
								}}
							>
								Something went wrong
							</h1>
							<p
								style={{
									fontSize: "0.875rem",
									color: "#a1a1aa",
									margin: 0,
								}}
							>
								A critical error occurred. Please try refreshing the page.
							</p>
						</div>

						{isDev && error.message && (
							<div
								style={{
									backgroundColor: "#27272a",
									borderRadius: "0.375rem",
									padding: "0.75rem",
									fontFamily: "monospace",
									fontSize: "0.75rem",
									color: "#a1a1aa",
									marginBottom: "1.5rem",
									wordBreak: "break-all",
								}}
							>
								<p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
									Error:
								</p>
								<p style={{ margin: 0 }}>{error.message}</p>
								{error.digest && (
									<p
										style={{
											marginTop: "0.5rem",
											fontSize: "0.625rem",
											opacity: 0.7,
										}}
									>
										Digest: {error.digest}
									</p>
								)}
							</div>
						)}

						{!isDev && error.digest && (
							<p
								style={{
									textAlign: "center",
									fontSize: "0.75rem",
									color: "#71717a",
									marginBottom: "1.5rem",
								}}
							>
								Error ID: {error.digest}
							</p>
						)}

						<div
							style={{
								display: "flex",
								justifyContent: "center",
								gap: "0.5rem",
							}}
						>
							<button
								onClick={reset}
								type="button"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 1rem",
									fontSize: "0.875rem",
									fontWeight: 500,
									borderRadius: "0.375rem",
									border: "1px solid #27272a",
									backgroundColor: "transparent",
									color: "#fafafa",
									cursor: "pointer",
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
									<path d="M21 3v5h-5" />
								</svg>
								Try Again
							</button>
							<a
								href="/"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 1rem",
									fontSize: "0.875rem",
									fontWeight: 500,
									borderRadius: "0.375rem",
									border: "none",
									backgroundColor: "#fafafa",
									color: "#18181b",
									cursor: "pointer",
									textDecoration: "none",
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
									<polyline points="9 22 9 12 15 12 15 22" />
								</svg>
								Go Home
							</a>
						</div>
					</div>
				</div>
			</body>
		</html>
	);
}
