export type LineChartType = "line";
export type BarChartType = "bar";
export type AreaChartType = "area";
export type CumulativeLineChartType = "cumulative-line";
export type NumberChartType = "number";
export type PieChartType = "pie";
export type BarTotalChartType = "bar-total";
export type TableChartType = "table";

export type ChartType =
	| LineChartType
	| BarChartType
	| AreaChartType
	| CumulativeLineChartType
	| NumberChartType
	| PieChartType
	| BarTotalChartType
	| TableChartType;

export type TimeSeriesChartTypes =
	| LineChartType
	| BarChartType
	| AreaChartType
	| CumulativeLineChartType;

export type ChartData = {
	data: number[];
	aggregated_value: number;
	days: string[];
	labels: string[];
	label: string;
};

export type Chart<
	Type extends ChartType,
	Labels extends string,
	IsBreakdown extends boolean,
> = {
	type: Type;
	results: Record<
		Labels,
		IsBreakdown extends true ? Record<string, ChartData> : ChartData
	>;
};
