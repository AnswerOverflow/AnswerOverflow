import { Navbar } from './primitives/Navbar';
import { Footer } from './Footer';

export const PageWrapper = ({
	children,
	disableDefaultBackground,
}: {
	children: React.ReactNode;
	disableDefaultBackground?: boolean;
}) => (
	<div className="mx-auto w-full overflow-y-scroll bg-ao-white scrollbar-hide overflow-x-hidden dark:bg-ao-black sm:px-4">
		<Navbar />
		<main
			className={`${
				disableDefaultBackground ? '' : 'bg-ao-white dark:bg-ao-black '
			} px-[4rem] 2xl:px-[6rem]`}
		>
			{children}
		</main>
		<Footer />
	</div>
);
