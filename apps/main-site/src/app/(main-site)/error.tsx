"use client";

import { ErrorPage } from "@packages/ui/components/error-page";

export default function MainSiteError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return <ErrorPage error={error} reset={reset} homeHref="/" />;
}
