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

export function DatePickerWithPresets() {
	const [date, setDate] = React.useState<DateRange | undefined>({
		from: addDays(new Date(), -7),
		to: new Date(),
	});

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant={'outline'}
					className={cn(
						'w-[280px] justify-start text-left font-normal',
						!date && 'text-muted-foreground',
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{date?.from ? (
						date.to ? (
							<>
								{format(date.from, 'LLL dd, y')} -{' '}
								{format(date.to, 'LLL dd, y')}
							</>
						) : (
							format(date.from, 'LLL dd, y')
						)
					) : (
						<span>Pick a date</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="flex w-auto flex-col space-y-2 p-2">
				<Select
					onValueChange={(value) =>
						setDate({
							from: addDays(new Date(), -parseInt(value)),
							to: new Date(),
						})
					}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select" />
					</SelectTrigger>
					<SelectContent position="popper">
						<SelectItem value="0">Today</SelectItem>
						<SelectItem value="1">Yesterday</SelectItem>
						<SelectItem value="3">Past 3 days</SelectItem>
						<SelectItem value="7">Past week</SelectItem>
					</SelectContent>
				</Select>
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
