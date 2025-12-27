import { Effect } from "effect";
import type {
	BaseLightServerProps,
	BaseServerProps,
	ServerEventName,
	ServerEvents,
} from "../events/server";
import {
	flattenChannel,
	flattenChannelWithSettings,
	flattenMember,
	flattenMessageInfo,
	flattenServer,
	flattenServerWithSettings,
	flattenThread,
} from "../flatten";
import { PostHogCaptureClient } from "./capture-client";

const BASE_KEYS = new Set([
	"server",
	"channel",
	"thread",
	"user",
	"questionAsker",
	"questionSolver",
	"markAsSolver",
	"question",
	"solution",
	"accountId",
]);

export function track<K extends ServerEventName>(
	event: K,
	props: ServerEvents[K] &
		Partial<Omit<BaseServerProps, "server"> & BaseLightServerProps>,
): Effect.Effect<void, never, PostHogCaptureClient> {
	return Effect.gen(function* () {
		const posthog = yield* PostHogCaptureClient;
		if (!posthog) {
			console.warn(
				`[Analytics] PostHog client not initialized, skipping event: ${event}`,
			);
			return;
		}

		const flattenedProps: Record<string, unknown> = {};
		const p = props;

		if (p.server) {
			if (
				"readTheRulesConsentEnabled" in p.server &&
				p.server.readTheRulesConsentEnabled !== undefined
			) {
				Object.assign(flattenedProps, flattenServerWithSettings(p.server));
			} else {
				Object.assign(flattenedProps, flattenServer(p.server));
			}
		}

		if (p.channel) {
			if (p.channel.indexingEnabled) {
				Object.assign(flattenedProps, flattenChannelWithSettings(p.channel));
			} else {
				Object.assign(flattenedProps, flattenChannel(p.channel));
			}
		}

		if (p.thread) {
			Object.assign(flattenedProps, flattenThread(p.thread));
		}

		if (p.user) {
			Object.assign(flattenedProps, flattenMember(p.user, "User"));
		}

		if (p.questionAsker) {
			Object.assign(
				flattenedProps,
				flattenMember(p.questionAsker, "Question Asker"),
			);
		}

		if (p.questionSolver) {
			Object.assign(
				flattenedProps,
				flattenMember(p.questionSolver, "Question Solver"),
			);
		}

		if (p.markAsSolver) {
			Object.assign(
				flattenedProps,
				flattenMember(p.markAsSolver, "Mark As Solver"),
			);
		}

		if (p.question) {
			Object.assign(flattenedProps, flattenMessageInfo(p.question, "Question"));
		}

		if (p.solution) {
			Object.assign(flattenedProps, flattenMessageInfo(p.solution, "Solution"));
		}

		if (p.accountId && typeof p.accountId === "string") {
			flattenedProps["Answer Overflow Account Id"] = p.accountId;
		}

		for (const [key, value] of Object.entries(p)) {
			if (!BASE_KEYS.has(key) && value !== undefined) {
				flattenedProps[key] = value;
			}
		}

		const aoId = flattenedProps["Answer Overflow Account Id"];
		if (!aoId) {
			console.error(
				`[Analytics] Missing "Answer Overflow Account Id" for event "${event}". Props:`,
				Object.keys(flattenedProps),
			);
			return;
		}

		const captureData: Parameters<typeof posthog.capture>[0] = {
			event,
			distinctId: String(aoId),
			properties: flattenedProps,
		};

		const serverId =
			"Server Id" in flattenedProps ? flattenedProps["Server Id"] : undefined;
		if (serverId !== undefined) {
			captureData.groups = {
				server: String(serverId),
			};
		}

		yield* Effect.sync(() => {
			posthog.capture(captureData);
		});
	}).pipe(
		Effect.catchAll((error) =>
			Effect.sync(() => {
				console.error(`[Analytics] Failed to track event "${event}":`, error);
			}),
		),
	);
}

export const trackEvent = track;

export function registerServerGroup(props: {
	"Server Id": string;
	[key: string]: unknown;
}): Effect.Effect<void, never, PostHogCaptureClient> {
	return Effect.gen(function* () {
		const posthog = yield* PostHogCaptureClient;
		if (!posthog) {
			console.warn(
				`[Analytics] PostHog client not initialized, skipping server group registration`,
			);
			return;
		}
		yield* Effect.sync(() => {
			posthog.groupIdentify({
				groupType: "server",
				groupKey: props["Server Id"],
				properties: props,
			});
		});
	}).pipe(
		Effect.catchAll((error) =>
			Effect.sync(() => {
				console.error(`[Analytics] Failed to register server group:`, error);
			}),
		),
	);
}
