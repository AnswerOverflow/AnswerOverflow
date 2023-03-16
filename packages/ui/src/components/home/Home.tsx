import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { HomeLeadText } from './HomeLeadText';
import { QuestionAnswerArea } from './QuestionAnswerArea/QuestionAnswerArea';
import { messageData } from './HomeMessages';
import { Navbar } from '../primitives/Navbar';

export const Home = () => {
	const DownChevron = () => (
		<div className="absolute">
			<div className="mx-auto h-16 w-16 text-black/[.65] dark:text-white/[.65]">
				{<ChevronDownIcon strokeWidth={0.5} />}
			</div>
		</div>
	);
	return (
		<div className="bg-[linear-gradient(180.49deg,_#1A1818_-12.07%,_#0E0D0D_-12.07%,_#040405_-12.06%,_#101214_103.52%)] sm:px-4">
			<Navbar />

			<div className="relative z-50 min-h-[calc(100vh-10rem)] py-10 px-4 sm:px-[4rem] 2xl:px-[6rem]">
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
		</div>
	);
};
