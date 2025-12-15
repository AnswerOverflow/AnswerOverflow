"use client";

import { useEffect } from "react";
import { usePostHog } from "./use-posthog";

export function SessionRecording() {
	const posthog = usePostHog();

	useEffect(() => {
		if (!posthog) return;

		posthog.startSessionRecording();

		return () => {
			posthog.stopSessionRecording();
		};
	}, [posthog]);

	return null;
}
