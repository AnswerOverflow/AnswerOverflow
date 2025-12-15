import { Option } from "effect";

const DISCORD_EPOCH = BigInt(1420070400000);

export type ParsedSnowflake = {
	id: bigint;
	cleaned: string;
	wasCleaned: boolean;
};

export function parseSnowflakeId(
	value: string,
): Option.Option<ParsedSnowflake> {
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
}

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
