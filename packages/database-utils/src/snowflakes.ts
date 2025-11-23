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
