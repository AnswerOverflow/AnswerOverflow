import { useRef } from 'react';
import Xarrow from 'react-xarrows';
import { DemoMessage, type MessageProps } from '../DemoMessage';
import { useThemeContext } from '~ui/utils/theme';
import { GooglePage } from './GooglePage/GooglePage';
import './DashAnimation.css';

export interface NewLandingAnimationProps {
	questionMessage: MessageProps;
	answerMessage: MessageProps;
	discordChannelName: string;
}

export const QuestionAnswerArea = ({
	discordChannelName,
	questionMessage,
	answerMessage,
}: NewLandingAnimationProps) => {
	const googlePageRef = useRef(null);
	const discordPageRef = useRef(null);
	const { theme } = useThemeContext();

	return (
		<>
			<div className="flex flex-col gap-10 rounded-lg border-1 border-[#C5C5C5] bg-gradient-to-br-light-glass py-20 pl-16 pr-8 shadow-[0px_0px_111px_20px_rgba(57,_111,_248,_0.39)] backdrop-blur-md dark:border-[#343434] dark:bg-gradient-to-br-dark-glass lg:shadow-[0px_0px_222px_41px_rgba(57,_111,_248,_0.39)] xl:py-10 2xl:py-12">
				{/* Discord */}
				<div className="rounded-md bg-[#36393F]" ref={discordPageRef}>
					{/* Channel name */}
					<div className="border-b-1 border-black/50 px-5 py-2">
						<span className="text-white">{discordChannelName}</span>
					</div>

					<div ref={discordPageRef}>
						<DemoMessage
							{...questionMessage}
							showLinkIcon={false}
							forceDarkMode={true}
						/>
						<DemoMessage
							{...answerMessage}
							additionalMessageBoxClassNames="rounded-b-md"
							showLinkIcon={false}
							forceDarkMode={true}
						/>
					</div>
				</div>

				{/* Google */}
				<GooglePage
					result={{
						url: 'https://www.answeroverflow.com > ...',
						title: 'How do I index my discord channels into google?',
						// TODO: Add description, will require arrow offsets to be changed
						description:
							'Hey @Jolt, you can use Answer Overflow to do that! Learn more at answeroverflow.com!',
					}}
					ref={googlePageRef}
				/>
			</div>
			<div className="arrow">
				<Xarrow
					start={discordPageRef}
					end={googlePageRef}
					color={theme === 'dark' ? 'white' : 'black'}
					strokeWidth={3}
					startAnchor={'left'}
					endAnchor={{
						position: 'auto',
						offset: { x: -18, y: 0 },
					}}
					dashness={true}
					curveness={2}
					_cpx1Offset={-60}
					_cpx2Offset={-60}
				/>
			</div>
		</>
	);
};
