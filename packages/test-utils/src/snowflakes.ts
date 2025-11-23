import * as fc from "fast-check";

const DISCORD_EPOCH = 1420070400000n;

function generateSnowflake(
	timestampMs: bigint,
	workerId: bigint,
	processId: bigint,
	increment: bigint,
): string {
	const timestamp = timestampMs - DISCORD_EPOCH;
	const value =
		(timestamp << 22n) | (workerId << 17n) | (processId << 12n) | increment;
	return value.toString();
}

export const discordSnowflake = fc
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

export function generateSnowflakeString(): string {
	const result = fc.sample(discordSnowflake, { numRuns: 1 })[0];
	if (!result) {
		throw new Error("Failed to generate snowflake string");
	}
	return result;
}
