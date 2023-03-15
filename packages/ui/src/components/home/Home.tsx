import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { HomeLeadText } from './HomeLeadText';
import { QuestionAnswerArea } from './QuestionAnswerArea/QuestionAnswerArea';
import { messageData } from './HomeMessages';
import { PageWrapper } from '../PageWrapper';

export const Home = () => {
	const DownChevron = () => (
		<div className="absolute bottom-0 w-full">
			<div className="mx-auto h-16 w-16 text-black/[.65] dark:text-white/[.65]">
				{<ChevronDownIcon strokeWidth={0.5} />}
			</div>
		</div>
	);
	return (
		<PageWrapper>
			<div className="relative z-50 min-h-[calc(100vh-4rem)] py-10">
				<DownChevron />
				<div className="flex h-full w-full flex-row transition-all lg:gap-32 2xl:gap-72">
					<HomeLeadText />
					<div className="hidden items-center justify-center xl:flex 2xl:grow">
						<QuestionAnswerArea
							discordChannelName={
								'How do I index discord channels into google?'
							}
							questionMessage={messageData.questionMessage}
							answerMessage={messageData.answerMessage}
						/>
					</div>
				</div>
			</div>
		</PageWrapper>
	);
};
