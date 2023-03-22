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
				className="h-16 w-16 rounded-lg focus:ring-0 focus:ring-offset-0 dark:hover:bg-ao-black"
				onClick={props.scrollIntoView}
			>
				<ChevronDownIcon className="h-16 w-16" />
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
		<>
			<div className="relative bg-ao-white dark:bg-[linear-gradient(180.49deg,_#1A1818_-12.07%,_#0E0D0D_-12.07%,_#040405_-12.06%,_#101214_103.52%)]">
				<Navbar />
				<div className="sm:px-4">
					<HeroArea />
				</div>
			</div>
			<DownChevron scrollIntoView={executeScroll} />
			<div
				className="flex justify-center bg-ao-white/[.95] dark:bg-gradient-to-b dark:from-[#0F1113] dark:to-ao-black sm:px-4"
				ref={aboutRef}
			>
				<AboutArea />
			</div>
			<Footer />
		</>
	);
};
