import {
	SNOWFLAKE_MAX,
	SNOWFLAKE_MIN,
} from "@packages/database-utils/snowflakes-test";
import { Context, Effect, Layer } from "effect";

/** Allocates distinct default identities for one test database; explicit IDs may be reused for updates. */
export class FixtureIds extends Context.Tag("FixtureIds")<
	FixtureIds,
	{ readonly allocate: (explicit?: bigint) => Effect.Effect<bigint> }
>() {}

/** Owns the allocator for the same lifetime as a test database. */
export const FixtureIdsLayer = Layer.sync(FixtureIds, () => {
	let next = SNOWFLAKE_MIN;
	const reserved = new Set<bigint>();
	return {
		allocate: (explicit) =>
			Effect.sync(() => {
				if (explicit !== undefined) {
					reserved.add(explicit);
					return explicit;
				}
				while (reserved.has(next)) next += 1n;
				if (next > SNOWFLAKE_MAX) throw new Error("Test fixture IDs exhausted");
				const id = next;
				reserved.add(id);
				next += 1n;
				return id;
			}),
	};
});
