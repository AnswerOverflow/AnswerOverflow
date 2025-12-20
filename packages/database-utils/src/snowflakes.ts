import { Duration, Option, pipe } from "effect";

export const DISCORD_EPOCH = 1420070400000n;

export const snowflakeToTimestamp = (snowflake: bigint): number =>
	Number((snowflake >> 22n) + DISCORD_EPOCH);

export const getTimestamp = (snowflake: bigint | string): number => {
	const sf = typeof snowflake === "bigint" ? snowflake : BigInt(snowflake);
	return snowflakeToTimestamp(sf);
};

export const getDate = (snowflake: bigint | string): Date =>
	new Date(getTimestamp(snowflake));

export const getSnowflakeUTCDate = (snowflake: bigint | string): string => {
	const date = getDate(snowflake);
	return `${
		date.getUTCMonth() + 1
	}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
};

export type ParsedSnowflake = {
	id: bigint;
	cleaned: string;
	wasCleaned: boolean;
};

export const parseSnowflakeId = (
	value: string,
): Option.Option<ParsedSnowflake> => {
	const match = value.match(/^(\d+)/);
	if (!match?.[1]) {
		return Option.none();
	}

	const cleaned = match[1];
	try {
		const id = BigInt(cleaned);
		return Option.some({
			id,
			cleaned,
			wasCleaned: cleaned !== value,
		});
	} catch {
		return Option.none();
	}
};

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

export const generateSnowflake = (
	timestampMs: bigint,
	workerId: bigint,
	processId: bigint,
	increment: bigint,
): string => {
	const timestamp = timestampMs - DISCORD_EPOCH;
	const value =
		(timestamp << 22n) | (workerId << 17n) | (processId << 12n) | increment;
	return value.toString();
};

export const generateOrderedSnowflakes = (count: number): string[] => {
	const now = BigInt(Date.now());
	const workerId = 0n;
	const processId = 0n;
	const snowflakes: string[] = [];
	for (let i = 0; i < count; i++) {
		snowflakes.push(generateSnowflake(now, workerId, processId, BigInt(i)));
	}
	return snowflakes;
};

export const timestampToSnowflake = (timestampMs: number): bigint => {
	const timestamp = BigInt(timestampMs) - DISCORD_EPOCH;
	return timestamp << 22n;
};

export const getSnowflakeFromDurationAgo = (
	duration: Duration.Duration,
): bigint => {
	const timestampMs = Date.now() - Duration.toMillis(duration);
	return timestampToSnowflake(timestampMs);
};
