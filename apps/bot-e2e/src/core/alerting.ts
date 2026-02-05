import { Config, Effect, Option } from "effect";
import { Pushover, PushoverError } from "./pushover-service";

export { PushoverError as AlertingError };

interface AlertPayload {
	testName: string;
	error: string;
	timestamp: string;
	environment?: string;
}

const AlertingConfig = Config.all({
	notifyOnSuccess: Config.string("NOTIFY_ON_SUCCESS").pipe(Config.option),
	environment: Config.string("RAILWAY_ENVIRONMENT").pipe(Config.option),
});

export const sendAlert = (payload: AlertPayload) =>
	Effect.gen(function* () {
		const pushover = yield* Pushover;
		const config = yield* AlertingConfig;

		if (!pushover.isConfigured) {
			console.warn(
				"PUSHOVER_USER_KEY or PUSHOVER_API_TOKEN not set, skipping alert",
			);
			return;
		}

		const environment = Option.getOrElse(config.environment, () => "unknown");
		const message = `${payload.error}\n\nEnvironment: ${environment}\nTime: ${payload.timestamp}`;

		yield* pushover.send({
			title: `🚨 E2E Failed: ${payload.testName}`,
			message,
			priority: 1,
			sound: "siren",
		});

		console.log("Pushover alert sent");
	});

export const sendSuccessNotification = (testName: string) =>
	Effect.gen(function* () {
		const pushover = yield* Pushover;
		const config = yield* AlertingConfig;

		const notifyOnSuccess = Option.isSome(config.notifyOnSuccess);

		if (!pushover.isConfigured || !notifyOnSuccess) {
			return;
		}

		yield* pushover.send({
			title: `✅ E2E Passed: ${testName}`,
			message: `Tests passed at ${new Date().toISOString()}`,
			priority: -1,
		});
	});
