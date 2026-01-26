import {
	captureException,
	captureMessage,
} from "@packages/observability/sentry";
import { Status } from "discord.js";
import { Console, Duration, Effect, Layer, Ref, Schedule } from "effect";
import { DiscordClient } from "../core/discord-client-service";
import { Discord } from "../core/discord-service";

const HEALTH_CHECK_INTERVAL = Duration.seconds(30);
const GATEWAY_DEATH_TIMEOUT = Duration.minutes(5);

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
	const maxConsecutiveFailures = Math.ceil(
		Duration.toMillis(GATEWAY_DEATH_TIMEOUT) /
			Duration.toMillis(HEALTH_CHECK_INTERVAL),
	);

	const checkHealth = Effect.gen(function* () {
		const wsStatus = client.ws.status;
		const wsPing = client.ws.ping;

		if (wsStatus === Status.Ready && wsPing >= 0) {
			const failures = yield* Ref.get(consecutiveFailures);
			if (failures > 0) {
				yield* Console.log(
					`Gateway connection recovered after ${String(failures)} failed checks (ping: ${String(wsPing)}ms)`,
				);
				captureMessage(
					`Gateway recovered after ${String(failures)} failed health checks`,
					"info",
				);
			}
			yield* Ref.set(consecutiveFailures, 0);
			return;
		}

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
		`Gateway health check started (interval: ${String(Duration.toMillis(HEALTH_CHECK_INTERVAL) / 1000)}s, death timeout: ${String(Duration.toMillis(GATEWAY_DEATH_TIMEOUT) / 1000)}s)`,
	);
});

export const GatewayHealthHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* startGatewayMonitoring;

		yield* discord.client.on("clientReady", () => startHealthCheck);
	}),
);
