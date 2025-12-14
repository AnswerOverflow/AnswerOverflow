const DISCORD_EPOCH = 1420070400000n;

export function getSnowflakeForDate(date: Date): string {
	const timestamp = BigInt(date.getTime());
	return ((timestamp - DISCORD_EPOCH) << 22n).toString();
}

export function getSnowflakeForDaysAgo(days: number): string {
	const daysAgoMs = days * 24 * 60 * 60 * 1000;
	const targetDate = new Date(Date.now() - daysAgoMs);
	return getSnowflakeForDate(targetDate);
}

export function snowflakeToDate(snowflake: string): Date {
	const snowflakeBigInt = BigInt(snowflake);
	const timestamp = (snowflakeBigInt >> 22n) + DISCORD_EPOCH;
	return new Date(Number(timestamp));
}
