import { Navbar } from './primitives/Navbar';
import { Footer } from './Footer';

export const BodyWrapper = ({ children }: { children: React.ReactNode }) => (
	<div className="mx-auto w-full max-w-screen-2xl overflow-y-scroll  bg-ao-white scrollbar-hide overflow-x-hidden dark:bg-ao-black sm:px-4">
		<Navbar />
		{children}
		<Footer />
	</div>
);
