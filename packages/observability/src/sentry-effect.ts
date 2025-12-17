import { Resource, Tracer } from "@effect/opentelemetry";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { NodeSDK } from "@opentelemetry/sdk-node";
import * as Sentry from "@sentry/node";
import * as SentryOpenTelemetry from "@sentry/opentelemetry";
import { Cause, Effect, Layer } from "effect";

export type SentryEffectConfig = {
	dsn: string | undefined;
	serviceName: string;
	environment: string;
	release?: string;
	sampleRate?: number;
	tracesSampleRate?: number;
	profilesSampleRate?: number;
};

const makeSentryTracer = (config: SentryEffectConfig) =>
	Effect.gen(function* () {
		const resource = yield* Resource.Resource;

		if (!config.dsn) {
			yield* Effect.logWarning(
				"Sentry DSN not provided, Sentry will not be initialized",
			);
			return;
		}

		Sentry.init({
			dsn: config.dsn,
			environment: config.environment,
			release: config.release,
			sampleRate: config.sampleRate ?? 0.25,
			tracesSampleRate: config.tracesSampleRate ?? 0.1,
			skipOpenTelemetrySetup: true,
		});

		const client = Sentry.getClient();
		if (!client) {
			yield* Effect.logWarning("Sentry client not available after init");
			return;
		}

		SentryOpenTelemetry.setupEventContextTrace(client);

		const SentryContextManager = SentryOpenTelemetry.wrapContextManagerClass(
			AsyncLocalStorageContextManager,
		);

		const sdk = new NodeSDK({
			resource,
			spanProcessor: new SentryOpenTelemetry.SentrySpanProcessor(),
			textMapPropagator: new SentryOpenTelemetry.SentryPropagator(),
			contextManager: new SentryContextManager(),
			sampler: new SentryOpenTelemetry.SentrySampler(client),
		});

		yield* Effect.addFinalizer(() =>
			Effect.gen(function* () {
				yield* Effect.promise(() => Sentry.flush(2000));
				yield* Effect.promise(() => sdk.shutdown());
			}),
		);

		sdk.start();

		yield* Effect.logInfo(`Sentry initialized for ${config.serviceName}`);
	});

export const createSentryEffectLayer = (
	config: SentryEffectConfig,
): Layer.Layer<never> =>
	Tracer.layerGlobal.pipe(
		Layer.provide(Layer.scopedDiscard(makeSentryTracer(config))),
		Layer.provide(
			Resource.layer({
				serviceName: config.serviceName,
			}),
		),
	);

export const captureException = (
	error: unknown,
	context?: {
		tags?: Record<string, string>;
		extra?: Record<string, unknown>;
		user?: { id: string; username?: string };
	},
) =>
	Effect.sync(() => {
		Sentry.withScope((scope) => {
			if (context?.tags) {
				for (const [key, value] of Object.entries(context.tags)) {
					scope.setTag(key, value);
				}
			}
			if (context?.extra) {
				for (const [key, value] of Object.entries(context.extra)) {
					scope.setExtra(key, value);
				}
			}
			if (context?.user) {
				scope.setUser(context.user);
			}
			Sentry.captureException(error);
		});
	});

export const captureEffectCause = <E>(
	cause: Cause.Cause<E>,
	context?: {
		tags?: Record<string, string>;
		extra?: Record<string, unknown>;
		user?: { id: string; username?: string };
	},
) => captureException(Cause.squash(cause), context);

export const tapErrorCauseToSentry = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
	context?: {
		tags?: Record<string, string>;
		extra?: Record<string, unknown>;
	},
): Effect.Effect<A, E, R> =>
	effect.pipe(
		Effect.tapErrorCause((cause) => captureEffectCause(cause, context)),
	);

export { Sentry };
