import { HomeLeadText } from './HomeLeadText';
import { QuestionAnswerArea } from './QuestionAnswerArea/QuestionAnswerArea';
import { messageData } from './HomeMessages';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const DownChevron = () => (
	<div className="absolute bottom-0 left-1/2 -translate-x-1/2">
		<div className="mx-auto h-16 w-16 text-black/[.65] dark:text-white/[.65]">
			{<ChevronDownIcon strokeWidth={0.5} />}
		</div>
	</div>
);

export const HeroArea = () => {
	return (
		<div className="z-20 min-h-[calc(100vh-10rem)] px-4 pt-10 pb-20 sm:px-[4rem] 2xl:px-[6rem]">
			<DownChevron />
			<div className="flex h-full w-full flex-row transition-all lg:gap-32 2xl:gap-72">
				<HomeLeadText />
				<div className="hidden items-center justify-center xl:flex 2xl:grow">
					<QuestionAnswerArea
						discordChannelName={'How do I index discord channels into google?'}
						questionMessage={messageData.questionMessage}
						answerMessage={messageData.answerMessage}
					/>
				</div>
			</div>
		</div>
	);
};
