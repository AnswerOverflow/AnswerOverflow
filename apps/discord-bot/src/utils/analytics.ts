import {
	type BaseProps,
	memberToAnalyticsUser,
	messageToAnalyticsMessage,
	PostHogCaptureClientLayer,
	registerServerGroup as registerServerGroupBase,
	trackEvent,
} from "@packages/analytics/server";
import type { Guild } from "discord.js";
import { Effect } from "effect";

export { memberToAnalyticsUser, messageToAnalyticsMessage, type BaseProps };

export function trackServerJoin(guild: Guild) {
	return trackEvent("Server Join", {
		"Answer Overflow Account Id": guild.ownerId,
		guild,
	});
}

export function trackServerLeave(guild: Guild) {
	return trackEvent("Server Leave", {
		"Answer Overflow Account Id": guild.ownerId,
		guild,
	});
}

export function registerServerGroup(guild: Guild, serverId: string) {
	return registerServerGroupBase({
		"Server Id": serverId,
		"Server Name": guild.name,
	});
}

export function trackDiscordEvent<K extends BaseProps>(
	event: string,
	props: K | (() => Promise<K>),
): void {
	if (props instanceof Function) {
		void Effect.runPromise(
			trackEvent(event, props).pipe(
				Effect.catchAll(() => Effect.void),
				Effect.provide(PostHogCaptureClientLayer),
			),
		).catch(() => {});
		return;
	}
	void Effect.runPromise(
		trackEvent(event, props).pipe(
			Effect.catchAll(() => Effect.void),
			Effect.provide(PostHogCaptureClientLayer),
		),
	).catch(() => {});
}
