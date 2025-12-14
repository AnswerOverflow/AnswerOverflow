"use client";

import { Button } from "@packages/ui/components/button";
import { useEffect } from "react";

export default function DashboardError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Dashboard error:", error);
	}, [error]);

	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
			<h2 className="text-xl font-semibold">Something went wrong</h2>
			<p className="text-muted-foreground">
				{error.message || "An unexpected error occurred"}
			</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	);
}
