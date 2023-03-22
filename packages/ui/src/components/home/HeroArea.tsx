import { QuestionAnswerArea } from './QuestionAnswerArea/QuestionAnswerArea';
import { messageData } from './HomeMessages';
import { Button } from '../primitives/Button';

const HomeLeadText = () => {
	return (
		<div className="flex w-full flex-col items-start justify-center gap-6 pb-20 xl:w-[60%]">
			<h1 className="text-center font-header text-4xl font-bold leading-[114.5%] text-ao-black dark:text-ao-white md:text-start md:text-6xl">
				Bringing your discord channels to google
			</h1>
			<p className="text-center font-body text-lg text-ao-black/[.95] dark:text-ao-white/[.85] md:text-start md:text-xl">
				Answer Overflow is an open source project designed to bring discord
				channels to your favourite search engine, enabling users to easily find
				the info they need, fast.
			</p>
			<Button
				variant={'default'}
				className="mx-auto text-xl shadow-[0px_0px_40px_rgba(255,_255,_255,_0.2)] duration-200 hover:shadow-[0px_0px_40px_rgba(255,_255,_255,_0.4)] xl:mx-0"
			>
				Get Started
			</Button>
		</div>
	);
};

export const HeroArea = () => {
	return (
		<div className="z-20 min-h-[calc(100vh-10rem)] px-4 pt-10 pb-20 sm:px-[4rem] 2xl:px-[6rem]">
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
