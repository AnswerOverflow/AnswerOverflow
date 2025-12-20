import {
	nullableSnowflakeArbitrary,
	snowflakeArbitrary,
} from "@packages/database-utils/snowflakes-test";
import * as fc from "effect/FastCheck";

export const guildDataArb = fc.record({
	id: snowflakeArbitrary,
	name: fc.string({ minLength: 1, maxLength: 100 }),
	icon: fc.oneof(fc.constant(null), fc.string()),
	description: fc.oneof(fc.constant(null), fc.string({ maxLength: 4096 })),
	vanityURLCode: fc.oneof(
		fc.constant(null),
		fc.string({ minLength: 1, maxLength: 20 }),
	),
	approximateMemberCount: fc.nat({ max: 1000000 }),
	memberCount: fc.nat({ max: 1000000 }),
});

export const channelDataArb = fc.record({
	id: snowflakeArbitrary,
	name: fc.string({ minLength: 1, maxLength: 100 }),
	parentId: nullableSnowflakeArbitrary,
});

export const channelDataWithoutParentArb = fc.record({
	id: snowflakeArbitrary,
	name: fc.string({ minLength: 1, maxLength: 100 }),
});

export const sampleOne = <T>(arb: fc.Arbitrary<T>, fallback: T): T =>
	fc.sample(arb, 1)[0] ?? fallback;
