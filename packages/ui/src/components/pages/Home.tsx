import { Footer } from '../primitives/Footer';
import { Navbar } from '../primitives/Navbar';
import { AboutArea } from './home/AboutArea';
import { HeroArea } from './home/HeroArea';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { useRef } from 'react';
import { Button } from '~ui/components/primitives/ui/button';
const DownChevron = (props: { scrollIntoView: () => unknown }) => (
	<div className="absolute bottom-10 left-1/2 block -translate-x-1/2 sm:hidden xl:block">
		<div className="mx-auto h-16 w-16 rounded-full text-black/[.65] dark:text-white/[.65]">
			<Button
				variant="ghost"
				className="rounded-lg focus:ring-0 focus:ring-offset-0 dark:hover:bg-inherit"
				onClick={props.scrollIntoView}
				size={'icon'}
			>
				<ChevronDownIcon className="h-8 w-8 rounded-full" />
				<span className="sr-only">Scroll down</span>
			</Button>
		</div>
	</div>
);
export const Home = () => {
	const aboutRef = useRef<HTMLDivElement>(null);
	const executeScroll = () =>
		aboutRef.current?.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
		});

	return (
		<div className="flex w-full flex-col items-center bg-background font-body dark:bg-[linear-gradient(180.49deg,_#1A1818_-12.07%,_#0E0D0D_-12.07%,_#040405_-12.06%,_#101214_103.52%)]">
			<div className="max-w-screen-3xl">
				<div className="relative">
					<Navbar />
					<div>
						<HeroArea />
					</div>
				</div>
				<DownChevron scrollIntoView={executeScroll} />
				<div className="flex justify-center py-2" ref={aboutRef}>
					<AboutArea />
				</div>
				<Footer />
			</div>
		</div>
	);
};
