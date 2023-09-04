import { Navbar } from '../primitives/Navbar';
import type { ServerPublic } from '@answeroverflow/api';
import { HeroArea } from '~ui/components/pages/home/HeroArea';
import { Footer } from '~ui/components/primitives/Footer';

export const Home = (props: {
	servers: Pick<ServerPublic, 'id' | 'icon' | 'name'>[];
}) => {
	return (
		<div className="flex w-full flex-col items-center bg-background font-body">
			<div className={'w-full max-w-screen-3xl'}>
				<Navbar />
			</div>
			<HeroArea servers={props.servers} />
			<div
				className={
					'grid w-full grid-cols-1 grid-rows-1 gap-8 p-8 text-center md:grid-cols-3'
				}
			>
				<div
					className={
						'h-40 rounded-2xl border-2 border-primary/[.3] p-8 drop-shadow-xl'
					}
				>
					<h2 className={'mb-8 text-2xl'}>Results for humans, not robots</h2>
					<span className={'text-xl'}>
						Used to adding {'Reddit'} to every search in order to get relevant
						results from humans?
					</span>
				</div>
				<div className={'bg-red-700'}>
					<h1>Setup for Free</h1>
					<span className={'text-xl'}>
						Used to adding {'Reddit'} to every search in order to get relevant
					</span>
				</div>
				<div className={'bg-red-700'}>
					<h1>Test</h1>
				</div>
			</div>
			<Footer />
		</div>
	);
};
