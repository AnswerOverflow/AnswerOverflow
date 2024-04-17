'use client';
import { DatePickerWithPresets } from '@answeroverflow/ui/src/ui/date-picker';
import {
	PageViewsLineChart,
	PageViewsTotalCard,
	ServerInvitesClickedTotalCard,
} from './components/home';

export default function Dashboard() {
	return (
		<div>
			<DatePickerWithPresets />
			<div>
				<div className="flex flex-row justify-start" suppressHydrationWarning>
					<PageViewsTotalCard />
					<ServerInvitesClickedTotalCard />
				</div>
				<PageViewsLineChart />
			</div>
		</div>
	);
}
