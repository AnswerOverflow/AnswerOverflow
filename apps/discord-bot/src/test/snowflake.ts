const DISCORD_EPOCH = 1420070400000n;

let counter = 0n;

export const generateSnowflakeId = (): string => {
	const timestamp = BigInt(Date.now()) - DISCORD_EPOCH;
	const workerId = 0n;
	const processId = 0n;
	const increment = counter++;

	const snowflake =
		(timestamp << 22n) | (workerId << 17n) | (processId << 12n) | increment;

	return snowflake.toString();
};
