import type { ChartConfig } from "../components/chart";
import type { ChartData } from "./types";

export function isChartData(
	data: ChartData | Record<string, ChartData> | undefined,
): data is ChartData {
	if (!data) return false;
	return Array.isArray(data.data) && Array.isArray(data.days);
}

export function toShadcnTimeseriesData<
	const Labels extends string,
	const IsBreakdown extends boolean,
	T extends Record<
		Labels,
		IsBreakdown extends true ? Record<string, ChartData> : ChartData
	>,
>(unformattedData: T) {
	const values = Object.values(unformattedData) as (
		| ChartData
		| Record<string, ChartData>
	)[];
	if (values.length === 0) {
		return { data: [], categories: [], labels: [] };
	}

	const first = values[0];
	if (!first) {
		return { data: [], categories: [], labels: [] };
	}

	let labels: string[];
	if (isChartData(first)) {
		labels = first.days;
	} else {
		const nestedValues = Object.values(first as Record<string, ChartData>);
		const firstNested = nestedValues.at(0);
		labels = firstNested?.days ?? [];
	}

	const data = labels.map((label: string, index: number) => {
		const output: Record<string, string | number> = { label };

		Object.keys(unformattedData).forEach((key) => {
			const val = unformattedData[key as keyof typeof unformattedData];
			if (!val) {
				return;
			}
			if (isChartData(val)) {
				const num = val.data[index];
				output[sanitizeCategoryName(val.label)] = num ?? 0;
			} else {
				Object.values(val).forEach((valEntry: ChartData) => {
					const num = valEntry.data[index];
					output[sanitizeCategoryName(valEntry.label)] = num ?? 0;
				});
			}
		});
		return output;
	});

	const categories = [
		...new Set(
			data.flatMap((d: Record<string, string | number>) =>
				Object.keys(d).filter((key) => key !== "label"),
			),
		),
	];

	return { data, categories, labels };
}

export function toShadcnCumulativeData<
	const Labels extends string,
	const IsBreakdown extends boolean,
>(
	results: Record<
		Labels,
		IsBreakdown extends true ? Record<string, ChartData> : ChartData
	>,
) {
	const output: { name: string; value: number; label: string }[] = [];
	Object.keys(results).forEach((key) => {
		const casted = results[key as keyof typeof results];
		if (isChartData(casted)) {
			output.push({
				name: casted.label,
				value: casted.aggregated_value,
				label: casted.label,
			});
		} else {
			Object.values(casted).forEach((subVal: ChartData) => {
				output.push({
					name: subVal.label,
					value: subVal.aggregated_value,
					label: subVal.label,
				});
			});
		}
	});
	return output;
}

export function sanitizeCategoryName(category: string): string {
	return category.replace(/\s+/g, "-").toLowerCase();
}

export function generateChartConfig(categories: string[]): ChartConfig {
	const config: ChartConfig = {};

	const lightColors = [
		"oklch(0.646 0.222 41.116)",
		"oklch(0.6 0.118 184.704)",
		"oklch(0.398 0.07 227.392)",
		"oklch(0.828 0.189 84.429)",
		"oklch(0.769 0.188 70.08)",
	] as const;

	const darkColors = [
		"oklch(0.7 0.25 264.376)",
		"oklch(0.75 0.2 162.48)",
		"oklch(0.8 0.22 70.08)",
		"oklch(0.72 0.28 303.9)",
		"oklch(0.76 0.26 16.439)",
	] as const;

	categories.forEach((category, index) => {
		const colorIndex = index % lightColors.length;
		const lightColor = lightColors[colorIndex];
		const darkColor = darkColors[colorIndex];

		if (!lightColor || !darkColor) {
			throw new Error(`Color index ${colorIndex} out of bounds`);
		}

		const sanitizedName = sanitizeCategoryName(category);
		config[sanitizedName] = {
			label: category,
			theme: {
				light: lightColor,
				dark: darkColor,
			},
		};
	});

	return config;
}
