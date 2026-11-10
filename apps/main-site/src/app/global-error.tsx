"use client";

import { GlobalErrorPage } from "@packages/ui/components/error-page";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return <GlobalErrorPage error={error} reset={reset} />;
}
