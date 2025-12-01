"use client";

import { Cell, Pie, PieChart as RechartsPieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/card";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "../components/chart";
import {
	Table as ShadcnTable,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../components/table";
import type {
	BarTotalChartType,
	Chart,
	NumberChartType,
	TableChartType,
} from "./types";
import {
	generateChartConfig,
	sanitizeCategoryName,
	toShadcnCumulativeData,
} from "./utils";

export type BarTotalChartProps<
	Labels extends string,
	IsBreakdown extends boolean,
> = Pick<Chart<BarTotalChartType, Labels, IsBreakdown>, "results"> & {
	className?: string;
	valueFormatter?: (value: number) => string;
};

export function BarTotalChart<
	const Labels extends string,
	const IsBreakdown extends boolean,
>(props: BarTotalChartProps<Labels, IsBreakdown>) {
	const { results, className, valueFormatter } = props;
	const data = toShadcnCumulativeData(results);

	const sortedData = [...data].sort((a, b) => b.value - a.value);

	return (
		<div className={className}>
			<div className="space-y-2">
				{sortedData.map((item, index) => {
					const maxValue = sortedData[0]?.value ?? 1;
					const percentage = (item.value / maxValue) * 100;

					return (
						<div key={`${item.name}-${index}`} className="space-y-1">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">{item.name}</span>
								<span className="text-muted-foreground">
									{valueFormatter
										? valueFormatter(item.value)
										: item.value.toLocaleString()}
								</span>
							</div>
							<div className="bg-muted h-2 w-full rounded-full overflow-hidden">
								<div
									className="bg-primary h-full transition-all"
									style={{ width: `${percentage}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export type PieChartProps<
	Labels extends string,
	IsBreakdown extends boolean,
> = {
	results: Record<
		Labels,
		IsBreakdown extends true ? Record<string, ChartData> : ChartData
	>;
	className?: string;
	showLegend?: boolean;
	valueFormatter?: (value: number) => string;
};

import type { ChartData } from "./types";

export function PieChart<
	const Labels extends string,
	const IsBreakdown extends boolean,
>(props: PieChartProps<Labels, IsBreakdown>) {
	const { results, className, showLegend = true, valueFormatter } = props;
	const data = toShadcnCumulativeData(results);
	const chartConfig = generateChartConfig(data.map((d) => d.name));

	return (
		<ChartContainer
			config={chartConfig}
			className={className}
			role="img"
			aria-label={`Pie chart showing ${data.map((d) => d.name).join(", ")}`}
		>
			<RechartsPieChart>
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
				<Pie
					data={data}
					dataKey="value"
					nameKey="name"
					cx="50%"
					cy="50%"
					innerRadius={60}
					outerRadius={80}
					isAnimationActive={false}
				>
					{data.map((entry, index) => (
						<Cell
							key={`cell-${index}`}
							fill={`var(--color-${sanitizeCategoryName(entry.name)})`}
						/>
					))}
				</Pie>
			</RechartsPieChart>
		</ChartContainer>
	);
}

export type TableProps<
	Labels extends string,
	IsBreakdown extends boolean,
> = Chart<TableChartType, Labels, IsBreakdown> & {
	className?: string;
	valueFormatter?: (value: number) => string;
};

export function Table<Labels extends string, IsBreakdown extends boolean>(
	props: TableProps<Labels, IsBreakdown>,
) {
	const { results, className, valueFormatter } = props;
	const data = toShadcnCumulativeData(results);

	return (
		<ShadcnTable className={className}>
			<TableHeader>
				<TableRow>
					<TableHead>Label</TableHead>
					<TableHead className="text-right">Value</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{data.map((item, index) => (
					<TableRow key={`${item.label}-${index}`}>
						<TableCell>{item.label}</TableCell>
						<TableCell className="text-right">
							{valueFormatter
								? valueFormatter(item.value)
								: item.value.toLocaleString()}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</ShadcnTable>
	);
}

export type NumberChartProps<
	Labels extends string,
	IsBreakdown extends boolean,
> = Chart<NumberChartType, Labels, IsBreakdown> & {
	className?: string;
	valueFormatter?: (value: number) => string;
};

export function NumberChart<Labels extends string, IsBreakdown extends boolean>(
	props: NumberChartProps<Labels, IsBreakdown>,
) {
	const { results, className, valueFormatter } = props;
	const data = toShadcnCumulativeData(results);

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{data.map((item, index) => (
				<Card key={`${item.name}-${index}`} className={className}>
					<CardHeader>
						<CardTitle className="text-sm font-medium">{item.name}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{valueFormatter
								? valueFormatter(item.value)
								: item.value.toLocaleString()}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
