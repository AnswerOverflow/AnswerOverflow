import { Footer } from '../Footer';
import { Navbar } from '../primitives/Navbar';
import { AboutArea } from './AboutArea';
import { HeroArea } from './HeroArea';

export const Home = () => {
	return (
		<>
			<div className="relative bg-ao-white dark:bg-[linear-gradient(180.49deg,_#1A1818_-12.07%,_#0E0D0D_-12.07%,_#040405_-12.06%,_#101214_103.52%)]">
				<Navbar />
				<div className="sm:px-4">
					<HeroArea />
				</div>
			</div>
			<div className="flex justify-center bg-ao-white/[.95] dark:bg-gradient-to-b dark:from-[#0F1113] dark:to-ao-black sm:px-4">
				<AboutArea />
			</div>
			<Footer />
		</>
	);
};
