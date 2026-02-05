import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { Config, Context, Data, Effect, Layer, Option, Redacted } from "effect";

export class PushoverError extends Data.TaggedError("PushoverError")<{
	cause: unknown;
}> {}

export interface PushoverMessage {
	message: string;
	title?: string;
	sound?: string;
	device?: string;
	priority?: -2 | -1 | 0 | 1 | 2;
	url?: string;
	url_title?: string;
	retry?: number;
	expire?: number;
	html?: 1;
	timestamp?: number;
}

interface PushoverResponse {
	status: number;
	request: string;
	errors?: Array<string>;
}

type IPushover = Readonly<{
	send: (
		message: PushoverMessage,
	) => Effect.Effect<PushoverResponse, PushoverError>;
	isConfigured: boolean;
}>;

const PushoverConfig = Config.all({
	userKey: Config.redacted("PUSHOVER_USER_KEY").pipe(Config.option),
	apiToken: Config.redacted("PUSHOVER_API_TOKEN").pipe(Config.option),
});

const make = Effect.gen(function* () {
	const config = yield* PushoverConfig;
	const httpClient = yield* HttpClient.HttpClient;

	const userKey = Option.getOrNull(config.userKey);
	const apiToken = Option.getOrNull(config.apiToken);

	if (!userKey || !apiToken) {
		return {
			send: (_message: PushoverMessage) =>
				Effect.succeed({
					status: 0,
					request: "skipped-not-configured",
				}),
			isConfigured: false,
		} satisfies IPushover;
	}

	const token = Redacted.value(apiToken);
	const user = Redacted.value(userKey);

	const send = (message: PushoverMessage) =>
		Effect.gen(function* () {
			const formEntries: Record<string, string | number | undefined> = {
				token,
				user,
				message: message.message,
				title: message.title,
				sound: message.sound,
				device: message.device,
				priority: message.priority,
				url: message.url,
				url_title: message.url_title,
				retry: message.retry,
				expire: message.expire,
				html: message.html,
				timestamp: message.timestamp,
			};

			const filteredEntries = Object.fromEntries(
				Object.entries(formEntries).filter(([_, v]) => v !== undefined),
			);

			const request = HttpClientRequest.post(
				"https://api.pushover.net/1/messages.json",
			).pipe(HttpClientRequest.bodyFormDataRecord(filteredEntries));

			const response = yield* httpClient.execute(request);
			const data = (yield* response.json) as PushoverResponse;

			if (data.errors && data.errors.length > 0) {
				return yield* Effect.fail(
					new PushoverError({ cause: new Error(data.errors.join(", ")) }),
				);
			}

			return data;
		}).pipe(
			Effect.mapError((cause) => new PushoverError({ cause })),
			Effect.withSpan("pushover.send"),
		);

	return { send, isConfigured: true } satisfies IPushover;
});

export class Pushover extends Context.Tag("Pushover")<Pushover, IPushover>() {
	static Default = Layer.effect(this, make).pipe(
		Layer.provide(FetchHttpClient.layer),
		Layer.annotateSpans({ module: "Pushover" }),
	);
}
