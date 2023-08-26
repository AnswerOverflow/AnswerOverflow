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
			<div className={'grid w-full grid-cols-3 grid-rows-1 gap-8'}>
				<div className={'bg-red-700'}>
					<h1>How Does It Work</h1>
					<h1>Test</h1>
					<h1>Test</h1>
					<h1>Test</h1>
					<h1>Test</h1>
					<h1>Test</h1>
					<h1>Test</h1>
				</div>
				<div className={'bg-red-700'}>
					<h1>Test</h1>
				</div>
				<div className={'bg-red-700'}>
					<h1>Test</h1>
				</div>
			</div>
			<Footer />
		</div>
	);
};
