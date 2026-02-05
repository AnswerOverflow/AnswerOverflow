import { Config, Data, Effect, Option } from "effect";

export class AlertingError extends Data.TaggedError("AlertingError")<{
	cause: unknown;
}> {}

interface AlertPayload {
	testName: string;
	error: string;
	timestamp: string;
	environment?: string;
}

const PushoverConfig = Config.all({
	userKey: Config.string("PUSHOVER_USER_KEY").pipe(Config.option),
	apiToken: Config.string("PUSHOVER_API_TOKEN").pipe(Config.option),
	notifyOnSuccess: Config.string("NOTIFY_ON_SUCCESS").pipe(Config.option),
	environment: Config.string("RAILWAY_ENVIRONMENT").pipe(Config.option),
});

export const sendAlert = (payload: AlertPayload) =>
	Effect.gen(function* () {
		const config = yield* PushoverConfig;

		const userKey = Option.getOrNull(config.userKey);
		const apiToken = Option.getOrNull(config.apiToken);

		if (!userKey || !apiToken) {
			console.warn(
				"PUSHOVER_USER_KEY or PUSHOVER_API_TOKEN not set, skipping alert",
			);
			return;
		}

		const message = `${payload.error}\n\nEnvironment: ${payload.environment || "unknown"}\nTime: ${payload.timestamp}`;

		const formData = new FormData();
		formData.append("token", apiToken);
		formData.append("user", userKey);
		formData.append("title", `🚨 E2E Failed: ${payload.testName}`);
		formData.append("message", message);
		formData.append("priority", "1");
		formData.append("sound", "siren");

		const response = yield* Effect.tryPromise({
			try: () =>
				fetch("https://api.pushover.net/1/messages.json", {
					method: "POST",
					body: formData,
				}),
			catch: (cause) => new AlertingError({ cause }),
		});

		if (!response.ok) {
			const text = yield* Effect.tryPromise({
				try: () => response.text(),
				catch: (cause) => new AlertingError({ cause }),
			});
			console.error("Failed to send Pushover alert:", text);
		} else {
			console.log("Pushover alert sent");
		}
	});

export const sendSuccessNotification = (testName: string) =>
	Effect.gen(function* () {
		const config = yield* PushoverConfig;

		const userKey = Option.getOrNull(config.userKey);
		const apiToken = Option.getOrNull(config.apiToken);
		const notifyOnSuccess = Option.getOrNull(config.notifyOnSuccess);

		if (!userKey || !apiToken || !notifyOnSuccess) {
			return;
		}

		const formData = new FormData();
		formData.append("token", apiToken);
		formData.append("user", userKey);
		formData.append("title", `✅ E2E Passed: ${testName}`);
		formData.append("message", `Tests passed at ${new Date().toISOString()}`);
		formData.append("priority", "-1");

		yield* Effect.tryPromise({
			try: () =>
				fetch("https://api.pushover.net/1/messages.json", {
					method: "POST",
					body: formData,
				}),
			catch: (cause) => new AlertingError({ cause }),
		});
	});
