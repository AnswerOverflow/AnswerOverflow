import * as fc from "effect/FastCheck";

/**
 * Discord snowflake IDs are 64-bit integers, typically 17-19 digits when represented as strings.
 * The minimum valid snowflake is 17 digits (100000000000000000) and maximum is 19 digits (999999999999999999).
 */
const SNOWFLAKE_MIN = 100000000000000000n;
const SNOWFLAKE_MAX = 999999999999999999n;

/**
 * Arbitrary for generating Discord snowflake IDs as strings
 */
export const snowflakeArb = fc
	.bigInt({ min: SNOWFLAKE_MIN, max: SNOWFLAKE_MAX })
	.map((id) => id.toString());

/**
 * Arbitrary for generating nullable Discord snowflake IDs
 */
export const nullableSnowflakeArb = fc.oneof(fc.constant(null), snowflakeArb);

/**
 * Arbitrary for generating guild data with defaults
 */
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

/**
 * Arbitrary for generating channel data with defaults
 */
export const channelDataArb = fc.record({
	id: snowflakeArb,
	name: fc.string({ minLength: 1, maxLength: 100 }),
	parentId: nullableSnowflakeArb,
});

/**
 * Arbitrary for generating channel data without parentId
 */
export const channelDataWithoutParentArb = fc.record({
	id: snowflakeArb,
	name: fc.string({ minLength: 1, maxLength: 100 }),
});

/**
 * Sample a single value from an arbitrary with a fallback
 */
export const sampleOne = <T>(arb: fc.Arbitrary<T>, fallback: T): T =>
	fc.sample(arb, 1)[0] ?? fallback;
