import * as Progress from '@radix-ui/react-progress';
import { AOHead, Footer, Navbar } from '~ui/components/primitives';
import { GetStartedPageHandler } from './getStartedPage/GetStartedSection';
import {
	AllPageIndex,
	getStartedPages,
} from './getStartedPage/GetStartedSectionPages';
import { useState } from 'react';

export interface GetStartedPageProps {
	initialPageIndex: AllPageIndex;
}

const GetStartedPageProgress = ({ progress }: { progress: number }) => {
	return (
		<Progress.Root
			className="relative my-auto mb-4 h-8 w-full overflow-hidden rounded-full bg-black lg:mb-auto lg:mr-8 lg:h-96 lg:w-[25px]"
			style={{
				// Fix overflow clipping in Safari
				// https://gist.github.com/domske/b66047671c780a238b51c51ffde8d3a0
				transform: 'translateZ(0)',
			}}
			value={progress}
		>
			{/* Desktop */}
			<Progress.Indicator
				className="hidden h-full w-full bg-gradient-to-t from-ao-blue to-ao-red transition-transform duration-500 ease-[cubic-bezier(0.65,_0,_0.35,_1)] lg:block"
				style={{ transform: `translateY(${100 - progress}%)` }}
			/>

			{/* Mobile */}
			<Progress.Indicator
				className="block h-full w-full bg-gradient-to-r from-ao-blue to-ao-red transition-transform duration-500 ease-[cubic-bezier(0.65,_0,_0.35,_1)] lg:hidden"
				style={{ transform: `translateX(-${100 - progress}%)` }}
			/>
		</Progress.Root>
	);
};

export const GetStartedPage = ({ initialPageIndex }: GetStartedPageProps) => {
	const [progress, setProgress] = useState<number>(0);

	return (
		<div className="mx-auto flex min-h-screen w-full flex-col overflow-y-scroll bg-ao-white scrollbar-hide overflow-x-hidden dark:bg-ao-black">
			<Navbar />
			<main className="flex grow flex-row items-center justify-center bg-ao-white px-4 dark:bg-ao-black 2xl:px-[6rem]">
				<AOHead
					title="Get Started | Answer Overflow"
					description="Get started with Answer Overflow"
					path="/get-started"
				/>

				<div className="relative mx-auto flex flex-col lg:flex-row">
					<GetStartedPageProgress progress={progress} />
					<div className="min-h-[45vh] min-w-[50vw] max-w-6xl gap-16 rounded-standard border-1 bg-ao-black/[0.01] p-16 drop-shadow-2xl dark:border-ao-white/25 dark:bg-ao-white/[.01] lg:min-h-[75vh]">
						<GetStartedPageHandler
							pages={getStartedPages}
							setProgress={setProgress}
							initialPageIndex={initialPageIndex}
						/>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	);
};
