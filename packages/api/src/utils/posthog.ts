/* eslint-disable @typescript-eslint/naming-convention */
import dayjs from 'dayjs';
import { TrendAPIResponse } from './posthog-types';
/* eslint-disable @typescript-eslint/restrict-template-expressions */
async function posthogFetch(url: string, input: RequestInit) {
	const { headers, ...rest } = input;
	return await fetch(
		`https://app.posthog.com/api/projects/${process.env.POSTHOG_PROJECT_ID}/${
			url.startsWith('/') ? url.slice(1) : url
		}`,
		{
			headers: {
				Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
				...headers,
			},
			method: 'GET',
			...rest,
		},
	).then((res) => res.json());
}
export function toParams(
	obj: Record<string, any>,
	explodeArrays: boolean = false,
): string {
	if (!obj) {
		return '';
	}

	function handleVal(val: any): string {
		if (dayjs.isDayjs(val)) {
			return encodeURIComponent(val.format('YYYY-MM-DD'));
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		val = typeof val === 'object' ? JSON.stringify(val) : val;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return encodeURIComponent(val);
	}

	return Object.entries(obj)
		.filter((item) => item[1] != undefined && item[1] != null)
		.reduce((acc, [key, val]) => {
			/**
			 *  query parameter arrays can be handled in two ways
			 *  either they are encoded as a single query parameter
			 *    a=[1, 2] => a=%5B1%2C2%5D
			 *  or they are "exploded" so each item in the array is sent separately
			 *    a=[1, 2] => a=1&a=2
			 **/
			if (explodeArrays && Array.isArray(val)) {
				val.forEach((v) => acc.push([key, v]));
			} else {
				acc.push([key, val]);
			}

			return acc;
		}, [] as [string, any][])
		.map(([key, val]) => `${key}=${handleVal(val)}`)
		.join('&');
}

type PosthogParams = {
	insight: 'TRENDS';
	properties: any;
	date_from: string;
	entity_type: 'events';
	filter_test_accounts: boolean;
	refresh: boolean;
	events: {
		type: 'events';
		id: string;
		order: number;
		name: string;
		math: 'total';
	}[];
	formula?: string;
	interval: 'day';
	display:
		| 'BoldNumber'
		| 'ActionsLineGraph'
		| 'ActionsTable'
		| 'ActionsPie'
		| 'ActionsBar';
};

async function fetchPosthogInsight(input: {
	serverId: string;
	display:
		| 'BoldNumber'
		| 'ActionsLineGraph'
		| 'ActionsTable'
		| 'ActionsPie'
		| 'ActionsBar';
	refresh?: boolean;
	doNotRefetch?: boolean;
}) {
	const params: PosthogParams = {
		insight: 'TRENDS',
		refresh: input.refresh ?? false,
		filter_test_accounts: process.env.NODE_ENV === 'production',
		properties: {
			type: 'AND',
			values: [
				{
					type: 'AND',
					values: [
						{
							key: 'Server Id',
							value: [input.serverId],
							operator: 'exact',
							type: 'event',
						},
					],
				},
			],
		},
		entity_type: 'events',
		events: [
			{
				type: 'events',
				id: 'Community Page View',
				order: 0,
				name: 'Community Page View',
				math: 'total',
			},
			{
				type: 'events',
				id: 'Message Page View',
				order: 1,
				name: 'Message Page View',
				math: 'total',
			},
		],
		date_from: 'mStart',
		interval: 'day',
		display: input.display,
		formula: 'A + B',
	};

	const encodedQueryString = toParams(params);
	const data = (await posthogFetch(`insights/trend/?${encodedQueryString}`, {
		method: 'GET',
	})) as TrendAPIResponse;

	if (data.last_refresh) {
		const timeSinceLastRefresh = dayjs().diff(
			dayjs(data.last_refresh),
			'minute',
		);

		if (timeSinceLastRefresh > 10) {
			const refreshedData: TrendAPIResponse = await fetchPosthogInsight({
				...input,
				refresh: true,
				doNotRefetch: true,
			});
			return refreshedData;
		}
	}
	return data;
}

export async function fetchServerPageViewsAsLineChart(serverId: string) {
	const data = await fetchPosthogInsight({
		serverId,
		display: 'ActionsLineGraph',
	});
	const chartValues = data.result[0]!.labels.map((label, index) => ({
		day: label,
		'View Count': data.result[0]!.data[index] ?? 0,
	}));
	return chartValues;
}
