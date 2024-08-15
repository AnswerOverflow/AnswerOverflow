'use client';

import * as React from 'react';
import { addDays, format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem } from './select';
import { Calendar } from './calendar';
import { DateRange } from 'react-day-picker';
import { useState } from 'react';

export function DatePickerWithPresets(props: {
	onValueChange?: (range: { to: Date; from: Date }) => void;
	to?: Date;
	from?: Date;
}) {
	const [selectedRange, setSelectedRange] = useState<string | undefined>();
	const [date, setDate] = useState<DateRange | undefined>({
		from: props.from ?? addDays(new Date(), -7),
		to: props.to ?? new Date(),
	});
	console.log('selected range is', selectedRange);

	return (
		<Select
			onValueChange={(value) => {
				setSelectedRange(value);
				if (value !== 'custom') {
					setDate({
						from: addDays(new Date(), -parseInt(value)),
						to: new Date(),
					});
					props.onValueChange?.({
						from: addDays(new Date(), -parseInt(value)),
						to: new Date(),
					});
				}
			}}
		>
			<SelectTrigger className="w-[400px]">
				<CalendarIcon className="mr-2 h-4 w-4" />
				{date?.from ? (
					date.to ? (
						<>
							{format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
						</>
					) : (
						format(date.from, 'LLL dd, y')
					)
				) : (
					<span>Pick a date</span>
				)}{' '}
			</SelectTrigger>
			<SelectContent position="popper">
				<div className="flex flex-row gap-4 rounded-md">
					<div className="flex flex-col border-r pr-2">
						<SelectItem value="0">Today</SelectItem>
						<SelectItem value="1">Yesterday</SelectItem>
						<SelectItem value="3">Past 3 days</SelectItem>
						<SelectItem value="7">Past 7 days</SelectItem>
						<SelectItem value="30">Past 30 days</SelectItem>
						<SelectItem value="90">Past 90 days</SelectItem>
					</div>
					<Calendar
						initialFocus
						mode="range"
						defaultMonth={date?.from}
						selected={date}
						// limit to end of today
						toDate={new Date()}
						onSelect={(range) => {
							setDate(range);
							if (range) {
								const { from, to } = range;
								if (from && to)
									props.onValueChange?.({
										from,
										to,
									});
							}
						}}
						numberOfMonths={2}
					/>
				</div>
			</SelectContent>
		</Select>
	);
}
