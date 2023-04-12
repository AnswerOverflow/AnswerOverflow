import { AOHead, Footer, Navbar } from '~ui/components/primitives';
import { GetStartedPageHandler } from './getStartedPage/GetStartedSection';
import {
	AllPageIndex,
	getStartedPages,
} from './getStartedPage/GetStartedSectionPages';

export interface GetStartedPageProps {
	initialPageIndex: AllPageIndex;
}

export const GetStartedPage = ({ initialPageIndex }: GetStartedPageProps) => {
	return (
		<div className="mx-auto flex min-h-screen w-full flex-col overflow-y-scroll bg-ao-white scrollbar-hide overflow-x-hidden dark:bg-ao-black">
			<Navbar />
			<main className="flex grow flex-row items-center justify-center bg-ao-white px-4 dark:bg-ao-black 2xl:px-[6rem]">
				<AOHead
					title="Get Started | Answer Overflow"
					description="Get started with Answer Overflow"
					path="/get-started"
				/>

				<div className="relative w-full">
					<div className="absolute left-0 ml-32 h-full w-8 bg-black"></div>
					<div className="mx-auto max-w-6xl gap-16 rounded-standard border-1 bg-ao-black/[0.01] p-16 drop-shadow-2xl dark:border-ao-white/25 dark:bg-ao-white/[.01]">
						<GetStartedPageHandler
							pages={getStartedPages}
							initialPageIndex={initialPageIndex}
						/>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	);
};
