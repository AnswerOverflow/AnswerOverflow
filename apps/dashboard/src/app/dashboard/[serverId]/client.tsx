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

export default function Client() {
	return (
		<div className="flex flex-col gap-4">
			<DatePickerWithPresets />
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
