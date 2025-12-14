import * as fc from "effect/FastCheck";

const SNOWFLAKE_MIN = 100000000000000000n;
const SNOWFLAKE_MAX = 999999999999999999n;

const snowflakeArb = fc
	.bigInt({ min: SNOWFLAKE_MIN, max: SNOWFLAKE_MAX })
	.map((id) => id.toString());

const nullableSnowflakeArb = fc.oneof(fc.constant(null), snowflakeArb);

export const guildDataArb = fc.record({
	id: snowflakeArb,
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
	id: snowflakeArb,
	name: fc.string({ minLength: 1, maxLength: 100 }),
	parentId: nullableSnowflakeArb,
});

export const channelDataWithoutParentArb = fc.record({
	id: snowflakeArb,
	name: fc.string({ minLength: 1, maxLength: 100 }),
});

export const sampleOne = <T>(arb: fc.Arbitrary<T>, fallback: T): T =>
	fc.sample(arb, 1)[0] ?? fallback;
