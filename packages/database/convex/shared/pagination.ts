import { Array as Arr, Predicate } from "effect";

export async function paginateWithFilter<TRaw, TEnriched>(
	opts: {
		numItems: number;
		cursor: string | null;
		maxRounds?: number;
	},
	paginator: (paginationOpts: {
		numItems: number;
		cursor: string | null;
	}) => Promise<{
		page: TRaw[];
		isDone: boolean;
		continueCursor: string;
	}>,
	enricher: (items: TRaw[]) => Promise<Array<TEnriched | null>>,
): Promise<{
	page: TEnriched[];
	isDone: boolean;
	continueCursor: string;
}> {
	const maxRounds = opts.maxRounds ?? 7;
	const collected: TEnriched[] = [];
	let currentCursor = opts.cursor;
	let lastResult: { isDone: boolean; continueCursor: string } = {
		isDone: true,
		continueCursor: "",
	};

	for (let round = 0; round < maxRounds; round++) {
		const result = await paginator({
			numItems: opts.numItems,
			cursor: currentCursor,
		});
		lastResult = result;

		const enriched = await enricher(result.page);
		const filtered = Arr.filter(enriched, Predicate.isNotNull);
		collected.push(...filtered);

		if (result.isDone || collected.length >= opts.numItems) {
			break;
		}

		currentCursor = result.continueCursor;
	}

	return {
		page: collected,
		isDone: lastResult.isDone,
		continueCursor: lastResult.continueCursor,
	};
}
