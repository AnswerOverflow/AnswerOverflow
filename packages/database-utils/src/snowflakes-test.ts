import * as fc from "effect/FastCheck";
import { DISCORD_EPOCH, generateSnowflake } from "./snowflakes";

export const SNOWFLAKE_MIN = 100000000000000000n;
export const SNOWFLAKE_MAX = 999999999999999999n;

export const discordSnowflakeArbitrary = fc
	.bigInt({
		min: DISCORD_EPOCH,
		max: BigInt(Date.now()),
	})
	.chain((timestampMs) =>
		fc
			.tuple(
				fc.bigInt({ min: 0n, max: 31n }),
				fc.bigInt({ min: 0n, max: 31n }),
				fc.bigInt({ min: 0n, max: 4095n }),
			)
			.map(([workerId, processId, increment]) =>
				generateSnowflake(timestampMs, workerId, processId, increment),
			),
	);

export const snowflakeArbitrary = fc
	.bigInt({ min: SNOWFLAKE_MIN, max: SNOWFLAKE_MAX })
	.map((id) => id.toString());

export const snowflakeBigIntArbitrary = fc.bigInt({
	min: SNOWFLAKE_MIN,
	max: SNOWFLAKE_MAX,
});

export const nullableSnowflakeArbitrary = fc.oneof(
	fc.constant(null),
	snowflakeArbitrary,
);

export const generateSnowflakeString = (): string => {
	const result = fc.sample(discordSnowflakeArbitrary, { numRuns: 1 })[0];
	if (!result) {
		throw new Error("Failed to generate snowflake string");
	}
	return result;
};
