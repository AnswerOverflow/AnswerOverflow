import {
	AOHead,
	Footer,
	Heading,
	Navbar,
	Paragraph,
} from '~ui/components/primitives';
import { GetStartedModalPageHandler } from './getStartedModal/GetStartedSection';
import { getStartedModalPages } from './getStartedModal/GetStartedSectionPages';

export const GetStartedPage = () => {
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
					<div className="absolute left-0 mr-32 h-[75rem] w-16 bg-black"></div>
					<div className="mx-auto mx-auto max-w-6xl gap-16 rounded-standard border-1 p-16 drop-shadow-2xl dark:border-ao-white/25 dark:bg-ao-white/[.01]">
						<GetStartedModalPageHandler pages={getStartedModalPages} />
					</div>
				</div>
			</main>
			<Footer />
		</div>
	);
};
