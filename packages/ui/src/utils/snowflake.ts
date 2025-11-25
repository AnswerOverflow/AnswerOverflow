const DISCORD_EPOCH = BigInt(1420070400000);

export function getTimestamp(snowflake: bigint | string) {
	const sf = typeof snowflake === "bigint" ? snowflake : BigInt(snowflake);
	return Number((sf >> BigInt(22)) + DISCORD_EPOCH);
}

export function getDate(snowflake: bigint | string) {
	return new Date(getTimestamp(snowflake));
}

export function getSnowflakeUTCDate(snowflake: bigint | string) {
	const date = getDate(snowflake);
	return `${
		date.getUTCMonth() + 1
	}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}
