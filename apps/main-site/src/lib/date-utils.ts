export function parseDate(date: string | Date): Date {
	if (date instanceof Date) {
		return date;
	}
	const parsed = new Date(date);
	if (Number.isNaN(parsed.getTime())) {
		return new Date();
	}
	return parsed;
}

export function formatDate(
	date: string | Date,
	options: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "long",
		day: "numeric",
	},
): string {
	return parseDate(date).toLocaleDateString("en-US", options);
}
