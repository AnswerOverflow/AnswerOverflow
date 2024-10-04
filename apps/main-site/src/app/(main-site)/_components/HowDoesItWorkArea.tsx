import { GetStarted } from '@answeroverflow/ui/callouts';
import { messageData } from './HomeMessages';
import { QuestionAnswerArea } from './QuestionAnswerArea';

const HowDoesItWorkAreaText = () => {
	return (
		<div className="flex w-full flex-col items-start justify-center gap-6 xl:w-[60%]">
			<h1 className="text-center font-header text-4xl font-black leading-[114.5%] md:text-start md:text-6xl">
				Bringing Discord To The Web
			</h1>
			<p className="text-center font-body text-primary/[.95] md:text-start md:text-xl">
				Answer Overflow is an open source project designed to bring discord
				channels to your favorite search engine, enabling users to easily find
				the info they need, fast.
			</p>
			<div className="mb-8 flex w-full flex-col items-center justify-center gap-4 sm:w-fit sm:flex-row lg:mb-0">
				<GetStarted
					variant={'blue'}
					location="Hero"
					className="mx-auto w-auto px-6 text-lg shadow-[0px_0px_40px_rgba(255,_255,_255,_0.2)] duration-200 hover:shadow-[0px_0px_40px_rgba(255,_255,_255,_0.4)] xl:mx-0"
				/>
			</div>
		</div>
	);
};

export const HowDoesItWorkArea = () => {
	return (
		<div className="z-20 flex min-h-[calc(100vh-10rem)] items-center px-4 pb-20 pt-10 sm:px-[4rem] 2xl:px-[6rem]">
			<div className="flex h-full w-full flex-col transition-all lg:gap-32 xl:flex-row 2xl:gap-72">
				<HowDoesItWorkAreaText />
				<div className="hidden items-center justify-center sm:flex 2xl:grow">
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
