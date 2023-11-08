'use client';
import { usePostHog } from 'posthog-js/react';
export function IdentifyUser(props: { userId?: string }) {
	const posthog = usePostHog();
	if (props.userId) {
		posthog.identify(props.userId);
	} else {
		console.log('not identifying user');
	}
	return <></>;
}
