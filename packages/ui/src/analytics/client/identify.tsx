"use client";

import { useEffect, useRef } from "react";
import { usePostHog } from "./use-posthog";

export type IdentifyUser = {
	id: string;
	isAnonymous?: boolean;
	email?: string | null;
	name?: string | null;
};

export function PostHogIdentify({ user }: { user: IdentifyUser | null }) {
	const posthog = usePostHog();
	const hasIdentified = useRef(false);

	useEffect(() => {
		if (!posthog || !user || hasIdentified.current) {
			return;
		}

		if (user.isAnonymous) {
			return;
		}

		posthog.identify(user.id, {
			email: user.email ?? undefined,
			name: user.name ?? undefined,
		});

		hasIdentified.current = true;
	}, [posthog, user]);

	return null;
}
