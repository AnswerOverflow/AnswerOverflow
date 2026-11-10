import { Cause, Effect } from "effect";

export const catchAllWithReport = <E, A2, R, E2>(
	handler: (error: E) => Effect.Effect<A2, E2, R>,
) => {
	return <A, R2>(
		effect: Effect.Effect<A, E, R2>,
	): Effect.Effect<A | A2, E2, R | R2> =>
		effect.pipe(
			Effect.tapError((error) => Effect.logError(error)),
			Effect.catchAll(handler),
		);
};

export const catchAllSilentWithReport = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
): Effect.Effect<A | undefined, never, R> =>
	effect.pipe(
		Effect.tapError((error) => Effect.logError(error)),
		Effect.catchAll(() => Effect.succeed(undefined)),
	);

export const catchAllSucceedNullWithReport = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
): Effect.Effect<A | null, never, R> =>
	effect.pipe(
		Effect.tapError((error) => Effect.logError(error)),
		Effect.catchAll(() => Effect.succeed(null)),
	);

export const catchAllCauseWithReport = <E, A, R, E2>(
	handler: (cause: Cause.Cause<E>) => Effect.Effect<A, E2, R>,
) => {
	return <R2>(effect: Effect.Effect<A, E, R2>): Effect.Effect<A, E2, R | R2> =>
		effect.pipe(
			Effect.tapErrorCause((cause) => Effect.logError(cause)),
			Effect.catchAllCause(handler),
		);
};

// Like catchAllCauseWithReport, but interruption passes through instead of
// being converted into a handled "success". Use this at walk/loop sites that
// must survive one bad item: timeouts and shutdown interrupt fibers, and a
// handler that swallows the interrupt cause would let the loop keep running
// (and let callers mistake an aborted run for a completed one).
export const catchNonInterruptCauseWithReport = <E, A2, R, E2>(
	handler: (cause: Cause.Cause<E>) => Effect.Effect<A2, E2, R>,
) => {
	return <A, R2>(
		effect: Effect.Effect<A, E, R2>,
	): Effect.Effect<A | A2, E2, R | R2> =>
		effect.pipe(
			Effect.catchAllCause((cause) =>
				Cause.isInterruptedOnly(cause)
					? // An interrupted-only cause carries no typed failures, so
						// stripFailures is an identity that retypes it to Cause<never>.
						Effect.failCause(Cause.stripFailures(cause))
					: Effect.zipRight(Effect.logError(cause), handler(cause)),
			),
		);
};

export const catchAllCauseSilentWithReport = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
): Effect.Effect<A | undefined, never, R> =>
	effect.pipe(
		Effect.tapErrorCause((cause) => Effect.logError(cause)),
		Effect.catchAllCause(() => Effect.succeed(undefined)),
	);

export const catchAllDefectWithReport = <A, E, R, A2, R2>(
	handler: (defect: unknown) => Effect.Effect<A2, never, R2>,
) => {
	return (effect: Effect.Effect<A, E, R>): Effect.Effect<A | A2, E, R | R2> =>
		effect.pipe(
			Effect.tapDefect((defect) => Effect.logError(defect)),
			Effect.catchAllDefect(handler),
		);
};
