'use client';
import { DatePickerWithPresets } from '@answeroverflow/ui/src/ui/date-picker';
import {
	PageViewsLineChart,
	ServerInvitesUsedLineChart,
} from './components/home';

export default function Client() {
	return (
		<div className="flex flex-col gap-2">
			<DatePickerWithPresets />
			<div className="flex flex-col xl:flex-row">
				<PageViewsLineChart />
				<ServerInvitesUsedLineChart />
			</div>
		</div>
	);
}
