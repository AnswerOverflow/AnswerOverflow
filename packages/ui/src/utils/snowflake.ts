const DISCORD_EPOCH = BigInt(1420070400000);

export function getTimestamp(snowflake: string) {
	return Number((BigInt(snowflake) >> BigInt(22)) + DISCORD_EPOCH);
}

export function getDate(snowflake: string) {
	return new Date(getTimestamp(snowflake));
}

export function getSnowflakeUTCDate(snowflake: string) {
	const date = getDate(snowflake);
	return `${
		date.getUTCMonth() + 1
	}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}
