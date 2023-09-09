import { Navbar } from '../primitives/Navbar';
import type { ServerPublic } from '@answeroverflow/api';
import { HeroArea } from '~ui/components/pages/home/HeroArea';
import { Footer } from '~ui/components/primitives/Footer';
import { LinkButton } from '~ui/components/primitives/base/LinkButton';
import { FollowCursor } from '~ui/components/primitives/Follow';
import AOHead from '~ui/components/primitives/AOHead';

export const Home = (props: {
	servers: Pick<ServerPublic, 'id' | 'icon' | 'name'>[];
}) => {
	return (
		<div className="flex w-full flex-col items-center bg-background font-body">
			<AOHead
				path="/"
				title="Answer Overflow - Search all of Discord"
				addPrefix={false}
			/>
			<div className={'w-full max-w-screen-3xl'}>
				<Navbar />
			</div>
			<HeroArea servers={props.servers} />
			<div
				className={
					'grid w-full grid-cols-1 grid-rows-1 gap-8 p-8 text-center md:grid-cols-3'
				}
			>
				<FollowCursor intensity={40}>
					<div
						className={
							'flex flex-col justify-between rounded-2xl border-2 border-primary/[.1] p-8 text-center drop-shadow-xl'
						}
					>
						<h2 className={'mb-8 text-2xl'}>Browse All Communities</h2>
						<span className={'text-lg'}>
							Browse the hundreds of communities using Answer Overflow to make
							their content more accessible.
						</span>
						<LinkButton
							href={'/browse'}
							className={'mx-auto mt-8'}
							variant={'outline'}
						>
							Browse
						</LinkButton>
					</div>
				</FollowCursor>
				<FollowCursor intensity={40}>
					<div
						className={
							'flex flex-col justify-between rounded-2xl border-2 border-primary/[.1] p-8 text-center drop-shadow-xl'
						}
					>
						<h2 className={'mb-8 text-2xl'}>Setup for free</h2>
						<span className={'text-lg'}>
							Answer Overflow is free to use and setup for your community to
							start getting your Discord discussions indexed.
						</span>
						<LinkButton href={'/about'} className={'mx-auto mt-8'}>
							Learn More
						</LinkButton>
					</div>
				</FollowCursor>
				<FollowCursor intensity={40}>
					<div
						className={
							'flex flex-col justify-between rounded-2xl border-2 border-primary/[.1] p-8 text-center drop-shadow-xl'
						}
					>
						<h2 className={'mb-8 text-2xl'}>Open Source</h2>
						<span className={'text-lg'}>
							Answer Overflow is open source and MIT licensed, our goal is to
							make finding Discord content available to everyone.
						</span>
						<LinkButton
							href={'https://github.com/AnswerOverflow/AnswerOverflow/'}
							className={'mx-auto mt-8'}
							variant={'outline'}
						>
							Star on GitHub
						</LinkButton>
					</div>
				</FollowCursor>
			</div>
			<Footer />
		</div>
	);
};
