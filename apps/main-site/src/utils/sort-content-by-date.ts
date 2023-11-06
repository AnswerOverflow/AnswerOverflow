export function sortContentByDateNewestFirst<
	T extends {
		date: string;
	},
>(content: T[]): T[] {
	return content.sort((a, b) => {
		const dateA = new Date(a.date);
		const dateB = new Date(b.date);
		return dateB.getTime() - dateA.getTime();
	});
}
