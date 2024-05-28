'use client';
import { DatePickerWithPresets } from '@answeroverflow/ui/src/ui/date-picker';
import {
	PageViewsLineChart,
	PopularPagesTable,
	QuestionsAndAnswersLineChart,
	RequestAnInsight,
	ServerInvitesUsedLineChart,
	TopQuestionSolversTable,
} from './components/home';
import { useDashboardContext } from './components/dashboard-context';

export default function Client() {
	const { options } = useDashboardContext();
	return (
		<div className="flex flex-col gap-4">
			<DatePickerWithPresets
				from={options.from}
				to={options.to}
				onValueChange={(range) => options.setRange(range)}
			/>
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<PageViewsLineChart />
				<PopularPagesTable />
				<QuestionsAndAnswersLineChart />
				<TopQuestionSolversTable />
				<ServerInvitesUsedLineChart />
				<RequestAnInsight />
			</div>
		</div>
	);
}
