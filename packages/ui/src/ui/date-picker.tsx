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
		<Popover open={selectedRange == 'custom'}>
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
				<PopoverTrigger asChild>
					<SelectTrigger>
						<SelectValue placeholder="Select" />
					</SelectTrigger>
				</PopoverTrigger>
				<SelectContent position="popper">
					<SelectItem value="0">Today</SelectItem>
					<SelectItem value="1">Yesterday</SelectItem>
					<SelectItem value="3">Past 3 days</SelectItem>
					<SelectItem value="7">Past week</SelectItem>
					<SelectItem value="custom">Custom</SelectItem>
				</SelectContent>
			</Select>
			<PopoverContent>
				<div className="rounded-md border">
					<Calendar
						initialFocus
						mode="range"
						defaultMonth={date?.from}
						selected={date}
						onSelect={setDate}
						numberOfMonths={2}
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}
