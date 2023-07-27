import { QuestionAnswerArea } from './QuestionAnswerArea/QuestionAnswerArea';
import { messageData } from './HomeMessages';
import { GetStarted } from '~ui/components/primitives';
import { Button } from '~ui/components/primitives/ui/button';

const HomeLeadText = () => {
	return (
		<div className="flex w-full flex-col items-start justify-center gap-6 pb-20 xl:w-[60%]">
			<h1 className="text-center font-header text-4xl font-bold leading-[114.5%] md:text-start md:text-6xl">
				Bringing your Discord channels to Google
			</h1>
			<p className="text-primary/75 text-center font-body text-lg md:text-start md:text-xl">
				Answer Overflow is an open source project designed to bring discord
				channels to your favorite search engine. Set it up in minutes and bring
				discovery to your hidden content.
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

export const HeroArea = () => {
	return (
		<div className="z-20 flex min-h-[calc(100vh-10rem)] items-center px-4 pb-20 pt-10 sm:px-[4rem] 2xl:px-[6rem]">
			<div className="flex h-full w-full flex-col transition-all lg:gap-32 xl:flex-row 2xl:gap-72">
				<HomeLeadText />
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
