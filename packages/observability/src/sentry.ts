import * as Sentry from "@sentry/node";
import { Cause, Effect, Layer } from "effect";

export type SentryConfig = {
	dsn: string | undefined;
	environment: string;
	release?: string;
	sampleRate?: number;
	tracesSampleRate?: number;
	profilesSampleRate?: number;
};

export const initSentry = (config: SentryConfig) => {
	if (Sentry.getClient()) {
		return;
	}

	if (!config.dsn) {
		console.warn("Sentry DSN not provided, Sentry will not be initialized");
		return;
	}

	Sentry.init({
		dsn: config.dsn,
		environment: config.environment,
		release: config.release,
		sampleRate: config.sampleRate ?? 0.25,
		tracesSampleRate: config.tracesSampleRate ?? 0.1,
		profilesSampleRate: config.profilesSampleRate ?? 0.1,
	});
};

export const captureException = (
	error: unknown,
	context?: {
		tags?: Record<string, string>;
		extra?: Record<string, unknown>;
		user?: { id: string; username?: string };
	},
) => {
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
};

export const captureMessage = (
	message: string,
	level: "info" | "warning" | "error" = "info",
) => {
	Sentry.captureMessage(message, level);
};

export const setUser = (user: { id: string; username?: string } | null) => {
	Sentry.setUser(user);
};

export const setContext = (name: string, context: Record<string, unknown>) => {
	Sentry.setContext(name, context);
};

export const setTag = (key: string, value: string) => {
	Sentry.setTag(key, value);
};

export const flush = (timeout?: number) => {
	return Sentry.flush(timeout);
};

export const captureEffectCause = <E>(
	cause: Cause.Cause<E>,
	context?: {
		tags?: Record<string, string>;
		extra?: Record<string, unknown>;
		user?: { id: string; username?: string };
	},
) => {
	const prettyErrors = Cause.prettyErrors(cause);
	for (const error of prettyErrors) {
		captureException(error, {
			...context,
			extra: {
				...context?.extra,
				effectCausePretty: Cause.pretty(cause),
			},
		});
	}
};

export const tapErrorCauseToSentry = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
	context?: {
		tags?: Record<string, string>;
		extra?: Record<string, unknown>;
	},
): Effect.Effect<A, E, R> =>
	effect.pipe(
		Effect.tapErrorCause((cause) =>
			Effect.sync(() => captureEffectCause(cause, context)),
		),
	);

export const createSentryLayer = (config: SentryConfig): Layer.Layer<never> =>
	Layer.effectDiscard(
		Effect.sync(() => {
			initSentry(config);
		}),
	);

export { Sentry };
