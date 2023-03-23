import { Footer } from '../Footer';
import { Navbar } from '../primitives/Navbar';
import { AboutArea } from './AboutArea';
import { HeroArea } from './HeroArea';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { Button } from '../primitives';
import { useRef } from 'react';
const DownChevron = (props: { scrollIntoView: () => unknown }) => (
	<div className="absolute bottom-10 left-1/2 -translate-x-1/2">
		<div className="mx-auto h-16 w-16 text-black/[.65] dark:text-white/[.65]">
			<Button
				variant="ghost"
				className="h-16 w-16 rounded-lg focus:ring-0 focus:ring-offset-0 dark:hover:bg-inherit"
				onClick={props.scrollIntoView}
			>
				<ChevronDownIcon className="h-16 w-16 text-ao-black/[.6] hover:text-ao-black dark:text-ao-white/[.6] dark:hover:text-ao-white" />
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
		<div className="flex w-full flex-col items-center bg-ao-white dark:bg-[linear-gradient(180.49deg,_#1A1818_-12.07%,_#0E0D0D_-12.07%,_#040405_-12.06%,_#101214_103.52%)]">
			<div className="max-w-screen-2xl">
				<div className="relative ">
					<Navbar />
					<div className="sm:px-4">
						<HeroArea />
					</div>
				</div>
				<DownChevron scrollIntoView={executeScroll} />
				<div className="flex justify-center " ref={aboutRef}>
					<AboutArea />
				</div>
				<Footer />
			</div>
		</div>
	);
};
