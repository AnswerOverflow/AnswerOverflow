"use client";

import { useTrackEvent } from "../hooks/client";
import { EventMap } from "../hooks/events";

export function TrackLoad<K extends keyof EventMap | string>(props: {
  eventName: K;
  eventData: K extends keyof EventMap ? EventMap[K] : Record<string, unknown>;
  runOnce?: boolean;
}) {
  useTrackEvent(props.eventName, props.eventData, {
    runOnce: props.runOnce,
  });
  return <></>;
}
