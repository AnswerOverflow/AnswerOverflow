export type SearchParamValue = string | string[] | undefined;

export function getFirstSearchParamValue(
	value: SearchParamValue,
): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

export function hasNonEmptySearchParam(value: SearchParamValue): boolean {
	const param = getFirstSearchParamValue(value);
	return (param?.trim().length ?? 0) > 0;
}

export function buildSearchQueryString(
	params: Record<string, SearchParamValue>,
): string {
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined) {
			continue;
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				searchParams.append(key, item);
			}
			continue;
		}

		searchParams.set(key, value);
	}

	const queryString = searchParams.toString();
	return queryString ? `?${queryString}` : "";
}
