"use client";

import { GlobalErrorPage } from "@packages/ui/components/error-page";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return <GlobalErrorPage error={error} reset={reset} />;
}
