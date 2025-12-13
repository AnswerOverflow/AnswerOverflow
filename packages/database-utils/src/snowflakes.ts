import { Duration, Option, pipe } from "effect";

const DISCORD_EPOCH = 1420070400000n;

export const snowflakeToTimestamp = (snowflake: bigint): number =>
	Number((snowflake >> 22n) + DISCORD_EPOCH);

export const isSnowflakeWithin = (
	snowflake: bigint,
	duration: Duration.Duration,
): boolean => {
	const snowflakeTimestamp = snowflakeToTimestamp(snowflake);
	const threshold = Date.now() - Duration.toMillis(duration);
	return snowflakeTimestamp > threshold;
};

export const isSnowflakeOlderThan = (
	snowflake: bigint,
	duration: Duration.Duration,
): boolean => !isSnowflakeWithin(snowflake, duration);

export const wasRecentlyUpdated = (
	snowflake: bigint | null | undefined,
	duration: Duration.Duration,
): boolean =>
	pipe(
		Option.fromNullable(snowflake),
		Option.map((s) => isSnowflakeWithin(s, duration)),
		Option.getOrElse(() => false),
	);

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

export function generateOrderedSnowflakes(count: number): string[] {
	const now = BigInt(Date.now());
	const workerId = 0n;
	const processId = 0n;
	const snowflakes: string[] = [];
	for (let i = 0; i < count; i++) {
		snowflakes.push(generateSnowflake(now, workerId, processId, BigInt(i)));
	}
	return snowflakes;
}

export function timestampToSnowflake(timestampMs: number): bigint {
	const timestamp = BigInt(timestampMs) - DISCORD_EPOCH;
	return timestamp << 22n;
}

export function getSnowflakeFromDurationAgo(
	duration: Duration.Duration,
): bigint {
	const timestampMs = Date.now() - Duration.toMillis(duration);
	return timestampToSnowflake(timestampMs);
}
