"use client";

import { usePostHog as usePostHogOriginal } from "posthog-js/react";

export function usePostHog() {
	return usePostHogOriginal();
}
