"use client";

import { useEffect, useRef } from "react";

export function TrackLoad(props: {
	eventName: string;
	eventData: Record<string, unknown>;
	runOnce?: boolean;
}) {
	const hasSentAnalyticsEvent = useRef(false);

	useEffect(() => {
		const runOnce = props.runOnce ?? true;
		if (!hasSentAnalyticsEvent.current) {
			console.log("TrackLoad:", props.eventName, props.eventData);
			if (runOnce) {
				hasSentAnalyticsEvent.current = true;
			}
		}
	}, [props.eventName, props.eventData, props.runOnce]);

	return null;
}
