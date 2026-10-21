import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { Database } from "@packages/database/database";
import { Clock, Console, Duration, Effect, Either, Option } from "effect";

// Only the holder of this Convex lease may connect to the Discord gateway.
// Deploys briefly run two bot processes at once (the old one draining, the new
// one starting); the lease makes the new one wait instead of acting twice.
//
// Safety: Convex sets `expiresAt` to its own time when it runs a renew plus
// LEASE_TTL. That is no earlier than when this process sent the request, so a
// holder that stops acting FENCE_AFTER after sending its last confirmed renew
// stops at least LEASE_TTL - FENCE_AFTER before anyone else can acquire the
// lease. Stopping means destroying the Discord client and exiting.

export const GATEWAY_LEASE_NAME = "discord-gateway";
export const LEASE_TTL = Duration.seconds(30);
export const RENEW_INTERVAL = Duration.seconds(10);
export const FENCE_AFTER = Duration.seconds(20);
export const ACQUIRE_RETRY = Duration.seconds(2);
const RENEW_RETRY = Duration.seconds(1);

export interface Lease {
	readonly name: string;
	readonly holderId: string;
	readonly token: number;
}

export type AcquireResult =
	| { readonly acquired: true; readonly token: number }
	| {
			readonly acquired: false;
			readonly holderId: string;
			readonly expiresAt: number;
	  };

export interface LeaseStore<E = unknown> {
	readonly acquire: (input: {
		name: string;
		holderId: string;
		ttlMs: number;
	}) => Effect.Effect<AcquireResult, E>;
	readonly renew: (
		lease: Lease & { ttlMs: number },
	) => Effect.Effect<{ readonly renewed: boolean }, E>;
	readonly release: (lease: Lease) => Effect.Effect<unknown, E>;
}

export type LeaseLoss = "taken" | "expired";

export interface HeldLease {
	readonly lease: Lease;
	/** Monotonic time at which the request that confirmed the lease was sent. */
	readonly confirmedAt: number;
}

const ttlMs = Duration.toMillis(LEASE_TTL);

const monotonicMillis = Effect.map(Clock.currentTimeNanos, (nanos) =>
	Number(nanos / 1_000_000n),
);

export const newHolderId = () => `${hostname()}:${process.pid}:${randomUUID()}`;

/** Waits until this process holds the lease. */
export const acquireGatewayLease = <E>(
	store: LeaseStore<E>,
	holderId: string,
) =>
	Effect.gen(function* () {
		let waitingOn: string | undefined;
		while (true) {
			const sentAt = yield* monotonicMillis;
			const result = yield* Effect.either(
				store.acquire({ name: GATEWAY_LEASE_NAME, holderId, ttlMs }),
			);

			if (Either.isLeft(result)) {
				yield* Console.warn("Gateway lease acquire failed:", result.left);
				yield* Effect.sleep(ACQUIRE_RETRY);
				continue;
			}

			const outcome = result.right;
			if (outcome.acquired) {
				yield* Console.log(
					`Holding gateway lease ${GATEWAY_LEASE_NAME} (token ${String(outcome.token)})`,
				);
				return {
					lease: { name: GATEWAY_LEASE_NAME, holderId, token: outcome.token },
					confirmedAt: sentAt,
				} satisfies HeldLease;
			}

			if (waitingOn !== outcome.holderId) {
				waitingOn = outcome.holderId;
				yield* Console.log(
					`Waiting for gateway lease held by ${waitingOn} (expires ${new Date(outcome.expiresAt).toISOString()})`,
				);
			}
			yield* Effect.sleep(ACQUIRE_RETRY);
		}
	});

/**
 * Keeps the lease renewed. Completes only when this process must stop acting:
 * "taken" when Convex reports another holder, "expired" when no renew could be
 * confirmed within FENCE_AFTER of the last confirmed one.
 */
export const maintainGatewayLease = <E>(
	store: LeaseStore<E>,
	held: HeldLease,
): Effect.Effect<LeaseLoss> =>
	Effect.gen(function* () {
		const fenceAfterMs = Duration.toMillis(FENCE_AFTER);
		let confirmedAt = held.confirmedAt;
		while (true) {
			const sentAt = yield* monotonicMillis;
			const remainingMs = confirmedAt + fenceAfterMs - sentAt;
			if (remainingMs <= 0) return "expired";

			const result = yield* store
				.renew({ ...held.lease, ttlMs })
				.pipe(
					Effect.timeoutOption(Duration.millis(remainingMs)),
					Effect.either,
				);

			if (Either.isLeft(result)) {
				yield* Console.warn("Gateway lease renew failed:", result.left);
				yield* Effect.sleep(
					Duration.min(RENEW_RETRY, Duration.millis(remainingMs)),
				);
				continue;
			}
			if (Option.isNone(result.right)) return "expired";
			if (!result.right.value.renewed) return "taken";

			confirmedAt = sentAt;
			yield* Effect.sleep(RENEW_INTERVAL);
		}
	});

export const releaseGatewayLease = <E>(store: LeaseStore<E>, lease: Lease) =>
	store.release(lease).pipe(
		Effect.tap(() => Console.log("Released gateway lease")),
		Effect.catchAll((error) =>
			Console.warn("Gateway lease release failed:", error),
		),
	);

export const ConvexLeaseStore = Effect.map(
	Database,
	(database): LeaseStore => ({
		acquire: (input) =>
			database.private.gateway_lease.acquireGatewayLease(input),
		renew: (input) => database.private.gateway_lease.renewGatewayLease(input),
		release: (lease) =>
			database.private.gateway_lease.releaseGatewayLease(lease),
	}),
);
