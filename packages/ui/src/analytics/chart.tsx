"use client";

import {
	BarTotalChart,
	type BarTotalChartProps,
	NumberChart,
	type NumberChartProps,
	PieChart,
	type PieChartProps,
	Table,
	type TableProps,
} from "./cumulative";
import {
	AreaChart,
	type AreaChartProps,
	BarChart,
	type BarChartProps,
	LineChart,
	type LineChartProps,
} from "./timeseries";
import type {
	AreaChartType,
	BarChartType,
	BarTotalChartType,
	ChartType,
	CumulativeLineChartType,
	LineChartType,
	NumberChartType,
	PieChartType,
	TableChartType,
} from "./types";

export function Chart<
	const Type extends ChartType,
	const Labels extends string,
	const IsBreakdown extends boolean,
>(
	props: (Type extends LineChartType
		? LineChartProps<Labels, IsBreakdown>
		: Type extends CumulativeLineChartType
			? LineChartProps<Labels, IsBreakdown>
			: Type extends BarChartType
				? BarChartProps<Labels, IsBreakdown>
				: Type extends AreaChartType
					? AreaChartProps<Labels, IsBreakdown>
					: Type extends BarTotalChartType
						? BarTotalChartProps<Labels, IsBreakdown>
						: Type extends PieChartType
							? PieChartProps<Labels, IsBreakdown>
							: Type extends TableChartType
								? TableProps<Labels, IsBreakdown>
								: Type extends NumberChartType
									? NumberChartProps<Labels, IsBreakdown>
									: `!!!${Type} is not supported!`) & { type: Type },
) {
	const type = props.type;
	switch (type) {
		case "cumulative-line":
		case "line": {
			return <LineChart {...(props as LineChartProps<Labels, IsBreakdown>)} />;
		}
		case "bar": {
			return <BarChart {...(props as BarChartProps<Labels, IsBreakdown>)} />;
		}
		case "area": {
			return <AreaChart {...(props as AreaChartProps<Labels, IsBreakdown>)} />;
		}
		case "bar-total": {
			return (
				<BarTotalChart
					{...(props as BarTotalChartProps<Labels, IsBreakdown>)}
				/>
			);
		}
		case "pie": {
			return <PieChart {...(props as PieChartProps<Labels, IsBreakdown>)} />;
		}
		case "number":
			return (
				<NumberChart {...(props as NumberChartProps<Labels, IsBreakdown>)} />
			);
		case "table":
			return <Table {...(props as TableProps<Labels, IsBreakdown>)} />;
		default:
			throw new Error(`Unknown chart type: ${type}`);
	}
}
