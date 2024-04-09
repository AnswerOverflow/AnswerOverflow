'use client';

import * as React from 'react';
import { addDays, format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from '@radix-ui/react-popover';
import { cn } from '../utils/utils';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from './select';
import { Button } from './button';
import { Calendar } from './calendar';
import { DateRange } from 'react-day-picker';
import { useState } from 'react';

const dateOptions = [
	{
		label: 'Today',
	},
	{
		label: 'Yesterday',
	},
	{
		label: 'Past 24 hours',
	},
	{
		label: 'Last 7 days',
	},
	{
		label: 'Last 14 days',
	},
	{
		label: 'Last 30 days',
	},
	{
		label: 'Custom Date Range',
	},
];

export function DatePickerWithPresets() {
	const [selectedRange, setSelectedRange] = useState<string | undefined>();
	const [date, setDate] = useState<DateRange | undefined>({
		from: addDays(new Date(), -7),
		to: new Date(),
	});
	console.log('selected range is', selectedRange);

	return (
		<Select
			onValueChange={(value) => {
				console.log('updating value', value);
				setSelectedRange(value);
				if (value !== 'custom') {
					setDate({
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
				<div className="flex flex-row gap-4 rounded-md ">
					<div className="flex flex-col border-r pr-2">
						<SelectItem value="0">Today</SelectItem>
						<SelectItem value="1">Yesterday</SelectItem>
						<SelectItem value="3">Past 3 days</SelectItem>
						<SelectItem value="7">Past week</SelectItem>
					</div>
					<Calendar
						initialFocus
						mode="range"
						defaultMonth={date?.from}
						selected={date}
						onSelect={setDate}
						numberOfMonths={2}
					/>
				</div>
			</SelectContent>
		</Select>
	);
}
