import { QuestionAnswerArea } from './QuestionAnswerArea/QuestionAnswerArea';
import { messageData } from './HomeMessages';
import { Button, GetStarted } from '~ui/components/primitives';

const HowDoesItWorkAreaText = () => {
	return (
		<div className="flex w-full flex-col items-start justify-center gap-6 pb-20 xl:w-[60%]">
			<h1 className="text-center font-header text-4xl font-bold leading-[114.5%] text-ao-black dark:text-ao-white md:text-start md:text-6xl">
				Bringing your Discord channels to Google
			</h1>
			<p className="text-center font-body text-lg text-ao-black/[.95] dark:text-ao-white/[.85] md:text-start md:text-xl">
				Answer Overflow is an open source project designed to bring discord
				channels to your favorite search engine, enabling users to easily find
				the info they need, fast.
			</p>
			<div className="flex w-full flex-col items-center justify-center gap-8 sm:w-fit sm:flex-row">
				<GetStarted
					variant={'default'}
					location="Hero"
					className="mx-auto text-xl shadow-[0px_0px_40px_rgba(255,_255,_255,_0.2)] duration-200 hover:shadow-[0px_0px_40px_rgba(255,_255,_255,_0.4)] xl:mx-0"
				/>
				<Button
					variant="outline"
					className="mx-auto text-xl xl:mx-0"
					onClick={() => {
						document
							.getElementById('roadmap')
							?.scrollIntoView({ behavior: 'smooth' });
					}}
				>
					View roadmap
				</Button>
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
