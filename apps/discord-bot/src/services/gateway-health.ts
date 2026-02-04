import {
	captureException,
	captureMessage,
} from "@packages/observability/sentry";
import { Status } from "discord.js";
import { Console, Duration, Effect, Layer, Ref, Schedule } from "effect";
import { DiscordClient } from "../core/discord-client-service";
import { Discord } from "../core/discord-service";
import { getLastEventReceivedTime } from "./event-tracker";

const HEALTH_CHECK_INTERVAL = Duration.seconds(30);
const GATEWAY_DEATH_TIMEOUT = Duration.minutes(5);
const EVENT_SILENCE_TIMEOUT = Duration.minutes(3);

const startGatewayMonitoring = Effect.gen(function* () {
	const client = yield* DiscordClient;

	client.on("shardDisconnect", (closeEvent, shardId) => {
		const message = `Shard ${shardId} disconnected with code ${closeEvent.code} reason: ${closeEvent.reason || "none"}`;
		console.error(`[GatewayHealth] ${message}`);
		captureMessage(message, "error");
	});

	client.on("shardReconnecting", (shardId) => {
		console.warn(`[GatewayHealth] Shard ${shardId} reconnecting...`);
		captureMessage(`Shard ${shardId} reconnecting`, "warning");
	});

	client.on("shardResume", (shardId, replayedEvents) => {
		console.info(
			`[GatewayHealth] Shard ${shardId} resumed, replayed ${replayedEvents} events`,
		);
	});

	client.on("shardError", (error, shardId) => {
		const message = `Shard ${shardId} error: ${error.message}`;
		console.error(`[GatewayHealth] ${message}`);
		captureException(error, {
			tags: { discord_event: "shardError", shard_id: String(shardId) },
		});
	});

	client.on("invalidated", () => {
		console.error(
			"[GatewayHealth] Client session invalidated! Bot will be non-functional.",
		);
		captureMessage(
			"Discord client session invalidated - bot non-functional",
			"error",
		);
		process.exit(1);
	});

	yield* Console.log("Gateway event monitoring initialized");
});

const getWsStatusName = (status: Status): string => {
	switch (status) {
		case Status.Ready:
			return "Ready";
		case Status.Connecting:
			return "Connecting";
		case Status.Reconnecting:
			return "Reconnecting";
		case Status.Idle:
			return "Idle";
		case Status.Nearly:
			return "Nearly";
		case Status.Disconnected:
			return "Disconnected";
		case Status.WaitingForGuilds:
			return "WaitingForGuilds";
		case Status.Identifying:
			return "Identifying";
		case Status.Resuming:
			return "Resuming";
		default:
			return `Unknown(${String(status)})`;
	}
};

const startHealthCheck = Effect.gen(function* () {
	const client = yield* DiscordClient;
	const discord = yield* Discord;
	const consecutiveFailures = yield* Ref.make(0);
	const consecutiveEventSilence = yield* Ref.make(0);
	const maxConsecutiveFailures = Math.ceil(
		Duration.toMillis(GATEWAY_DEATH_TIMEOUT) /
			Duration.toMillis(HEALTH_CHECK_INTERVAL),
	);
	const maxEventSilenceChecks = Math.ceil(
		Duration.toMillis(EVENT_SILENCE_TIMEOUT) /
			Duration.toMillis(HEALTH_CHECK_INTERVAL),
	);

	const checkHealth = Effect.gen(function* () {
		const wsStatus = client.ws.status;
		const wsPing = client.ws.ping;
		const lastEventTime = getLastEventReceivedTime();
		const timeSinceLastEvent = Date.now() - lastEventTime;
		const eventSilenceThresholdMs = Duration.toMillis(EVENT_SILENCE_TIMEOUT);

		const isWsHealthy = wsStatus === Status.Ready && wsPing >= 0;
		const hasRecentEvents = timeSinceLastEvent < eventSilenceThresholdMs;

		if (isWsHealthy && hasRecentEvents) {
			const failures = yield* Ref.get(consecutiveFailures);
			const silenceCount = yield* Ref.get(consecutiveEventSilence);
			if (failures > 0 || silenceCount > 0) {
				yield* Console.log(
					`Gateway connection recovered after ${String(failures)} failed checks, ${String(silenceCount)} silence checks (ping: ${String(wsPing)}ms)`,
				);
				captureMessage(
					`Gateway recovered after ${String(failures)} failed health checks, ${String(silenceCount)} silence checks`,
					"info",
				);
			}
			yield* Ref.set(consecutiveFailures, 0);
			yield* Ref.set(consecutiveEventSilence, 0);
			return;
		}

		if (!isWsHealthy) {
			const newFailures = yield* Ref.updateAndGet(
				consecutiveFailures,
				(n) => n + 1,
			);
			const statusName = getWsStatusName(wsStatus);

			yield* Console.warn(
				`Gateway health check failed (${String(newFailures)}/${String(maxConsecutiveFailures)}): status=${statusName} ping=${String(wsPing)}ms`,
			);

			if (newFailures >= maxConsecutiveFailures) {
				const message = `Gateway dead for ${String(Duration.toMillis(GATEWAY_DEATH_TIMEOUT) / 1000)}s (${String(newFailures)} consecutive failures). Status: ${statusName}, Ping: ${String(wsPing)}ms. Forcing restart.`;
				console.error(`[GatewayHealth] ${message}`);
				captureMessage(message, "error");

				try {
					yield* discord.callClient(() => client.destroy());
				} catch {
					// noop
				}

				process.exit(1);
			}
		} else if (!hasRecentEvents) {
			yield* Ref.set(consecutiveFailures, 0);

			const newSilenceCount = yield* Ref.updateAndGet(
				consecutiveEventSilence,
				(n) => n + 1,
			);
			const statusName = getWsStatusName(wsStatus);
			const silenceDurationSec = Math.round(timeSinceLastEvent / 1000);

			yield* Console.warn(
				`Gateway zombie detected (${String(newSilenceCount)}/${String(maxEventSilenceChecks)}): No events for ${String(silenceDurationSec)}s. Status=${statusName} ping=${String(wsPing)}ms`,
			);

			if (newSilenceCount >= maxEventSilenceChecks) {
				const message = `Gateway zombie - no events received for ${String(silenceDurationSec)}s despite appearing healthy (status=${statusName}, ping=${String(wsPing)}ms). Forcing restart.`;
				console.error(`[GatewayHealth] ${message}`);
				captureMessage(message, "error");

				try {
					yield* discord.callClient(() => client.destroy());
				} catch {
					// noop
				}

				process.exit(1);
			}
		}
	}).pipe(
		Effect.withSpan("gateway_health.check"),
		Effect.catchAllCause((cause) =>
			Effect.gen(function* () {
				yield* Console.error("Health check itself failed:", cause);
				const newFailures = yield* Ref.updateAndGet(
					consecutiveFailures,
					(n) => n + 1,
				);
				if (newFailures >= maxConsecutiveFailures) {
					console.error(
						"[GatewayHealth] Health check failures exceeded threshold. Forcing restart.",
					);
					process.exit(1);
				}
			}),
		),
	);

	const schedule = Schedule.fixed(HEALTH_CHECK_INTERVAL);
	yield* Effect.fork(Effect.repeat(checkHealth, schedule));

	yield* Console.log(
		`Gateway health check started (interval: ${String(Duration.toMillis(HEALTH_CHECK_INTERVAL) / 1000)}s, death timeout: ${String(Duration.toMillis(GATEWAY_DEATH_TIMEOUT) / 1000)}s, event silence timeout: ${String(Duration.toMillis(EVENT_SILENCE_TIMEOUT) / 1000)}s)`,
	);
});

export const GatewayHealthHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* startGatewayMonitoring;

		yield* discord.client.on("clientReady", () => startHealthCheck);
	}),
);
