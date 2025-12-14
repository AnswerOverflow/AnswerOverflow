"use client";

import {
	Area,
	Bar,
	CartesianGrid,
	Line,
	AreaChart as RechartsAreaChart,
	BarChart as RechartsBarChart,
	LineChart as RechartsLineChart,
	XAxis,
	YAxis,
} from "recharts";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "../components/chart";
import type { Chart, TimeSeriesChartTypes } from "./types";
import { generateChartConfig, toShadcnTimeseriesData } from "./utils";

export type TimeSeriesChartProps<
	Labels extends string,
	IsBreakdown extends boolean,
> = Pick<Chart<TimeSeriesChartTypes, Labels, IsBreakdown>, "results"> & {
	categories?: Labels[];
	className?: string;
	showLegend?: boolean;
	valueFormatter?: (value: number) => string;
	colors?: string[];
};

export type LineChartProps<
	Labels extends string,
	IsBreakdown extends boolean,
> = TimeSeriesChartProps<Labels, IsBreakdown>;

export function LineChart<
	const Labels extends string,
	const IsBreakdown extends boolean,
>(props: LineChartProps<Labels, IsBreakdown>) {
	const {
		results,
		className,
		showLegend = true,
		valueFormatter,
		...rest
	} = props;
	const { data, categories } = toShadcnTimeseriesData(results);
	const chartConfig = generateChartConfig(categories);

	return (
		<ChartContainer
			config={chartConfig}
			className={className}
			role="img"
			aria-label={`Line chart showing ${categories.join(", ")}`}
		>
			<RechartsLineChart data={data} {...rest}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					tickMargin={10}
					axisLine={false}
					tickFormatter={(value) => value.slice(0, 6)}
				/>
				<YAxis tickLine={false} axisLine={false} />
				<ChartTooltip
					content={(props) => (
						<ChartTooltipContent
							{...props}
							formatter={
								valueFormatter
									? (value) => valueFormatter(Number(value))
									: undefined
							}
						/>
					)}
				/>
				{showLegend && <ChartLegend content={<ChartLegendContent />} />}
				{categories.map((category) => (
					<Line
						key={category}
						type="monotone"
						dataKey={category}
						stroke={`var(--color-${category})`}
						strokeWidth={2}
						dot={false}
						isAnimationActive={false}
					/>
				))}
			</RechartsLineChart>
		</ChartContainer>
	);
}

export type BarChartProps<
	Labels extends string,
	IsBreakdown extends boolean,
> = TimeSeriesChartProps<Labels, IsBreakdown>;

export function BarChart<
	const Labels extends string,
	const IsBreakdown extends boolean,
>(props: BarChartProps<Labels, IsBreakdown>) {
	const {
		results,
		className,
		showLegend = true,
		valueFormatter,
		...rest
	} = props;
	const { data, categories } = toShadcnTimeseriesData(results);
	const chartConfig = generateChartConfig(categories);

	return (
		<ChartContainer
			config={chartConfig}
			className={className}
			role="img"
			aria-label={`Bar chart showing ${categories.join(", ")}`}
		>
			<RechartsBarChart data={data} {...rest}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					tickMargin={10}
					axisLine={false}
					tickFormatter={(value) => value.slice(0, 6)}
				/>
				<YAxis tickLine={false} axisLine={false} />
				<ChartTooltip
					content={(props) => (
						<ChartTooltipContent
							{...props}
							formatter={
								valueFormatter
									? (value) => valueFormatter(Number(value))
									: undefined
							}
						/>
					)}
				/>
				{showLegend && <ChartLegend content={<ChartLegendContent />} />}
				{categories.map((category) => (
					<Bar
						key={category}
						dataKey={category}
						fill={`var(--color-${category})`}
						radius={4}
						isAnimationActive={false}
					/>
				))}
			</RechartsBarChart>
		</ChartContainer>
	);
}

export type AreaChartProps<
	Labels extends string,
	IsBreakdown extends boolean,
> = TimeSeriesChartProps<Labels, IsBreakdown>;

export function AreaChart<
	const Labels extends string,
	const IsBreakdown extends boolean,
>(props: AreaChartProps<Labels, IsBreakdown>) {
	const {
		results,
		className,
		showLegend = true,
		valueFormatter,
		...rest
	} = props;
	const { data, categories } = toShadcnTimeseriesData(results);
	const chartConfig = generateChartConfig(categories);

	return (
		<ChartContainer
			config={chartConfig}
			className={className}
			role="img"
			aria-label={`Area chart showing ${categories.join(", ")}`}
		>
			<RechartsAreaChart data={data} {...rest}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					tickMargin={10}
					axisLine={false}
					tickFormatter={(value) => value.slice(0, 6)}
				/>
				<YAxis tickLine={false} axisLine={false} />
				<ChartTooltip
					content={(props) => (
						<ChartTooltipContent
							{...props}
							formatter={
								valueFormatter
									? (value) => valueFormatter(Number(value))
									: undefined
							}
						/>
					)}
				/>
				{showLegend && <ChartLegend content={<ChartLegendContent />} />}
				{categories.map((category) => (
					<Area
						key={category}
						type="monotone"
						dataKey={category}
						fill={`var(--color-${category})`}
						fillOpacity={0.4}
						stroke={`var(--color-${category})`}
						strokeWidth={2}
						isAnimationActive={false}
					/>
				))}
			</RechartsAreaChart>
		</ChartContainer>
	);
}
