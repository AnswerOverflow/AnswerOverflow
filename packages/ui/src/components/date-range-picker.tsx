"use client";

import dayjs from "dayjs";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type DateRangePickerProps = {
	value: DateRange | undefined;
	onChange: (range: DateRange | undefined) => void;
	className?: string;
	placeholder?: string;
};

export function DateRangePicker({
	value,
	onChange,
	className,
	placeholder = "Pick a date range",
}: DateRangePickerProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"justify-start text-left font-normal",
						!value && "text-muted-foreground",
						className,
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{value?.from ? (
						value.to ? (
							<>
								{dayjs(value.from).format("MMM DD, YYYY")} -{" "}
								{dayjs(value.to).format("MMM DD, YYYY")}
							</>
						) : (
							dayjs(value.from).format("MMM DD, YYYY")
						)
					) : (
						<span>{placeholder}</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="range"
					defaultMonth={value?.from}
					selected={value}
					onSelect={onChange}
					numberOfMonths={2}
				/>
			</PopoverContent>
		</Popover>
	);
}
