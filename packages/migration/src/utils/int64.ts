export function toInt64(value: string): { $integer: string } {
	return { $integer: value };
}

export function toOptionalInt64(
	value: string | null | undefined,
): { $integer: string } | undefined {
	if (value === null || value === undefined) return undefined;
	return { $integer: value };
}
