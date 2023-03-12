import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '~ui/utils/index';
import { AnswerOverflowLogo } from '../AnswerOverflowLogo';
import { Button } from './Button';

export const Navbar = () => {
	const [navbarStyles, setNavbarStyles] = useState<string>('');
	const theme = useTheme();
	const navbarRef = useRef<HTMLDivElement>(null);

	// // When the user scrolls down make the navbar sticky
	// useEffect(() => {
	//   const handleScroll = () => {
	//     if (navbarRef.current) {
	//       console.log(window.scrollY)
	//       if (window.scrollY > 0) {
	//         setNavbarStyles("absolute top-0 bg-white dark:bg-black shadow-md");
	//       } else {
	//         setNavbarStyles("");
	//       }
	//     }
	//   };

	//   window.addEventListener("scroll", handleScroll);

	//   return () => {
	//     window.removeEventListener("scroll", handleScroll);
	//   };
	// }, []);

	return (
		<>
			<nav
				className={`${navbarStyles} z-50 flex min-h-[4rem] w-full items-center`}
				ref={navbarRef}
			>
				<div className="flex w-full items-center justify-center lg:hidden">
					<a href="/" aria-label="AnswerOverflow Logo">
						<AnswerOverflowLogo />
					</a>
				</div>
				<ol className="mx-[4rem] hidden w-full flex-row py-8 transition-all lg:flex 2xl:mx-[6rem]">
					<li>
						<a href="/" aria-label="AnswerOverflow Logo">
							<AnswerOverflowLogo />
						</a>
					</li>
					<li className="mx-6 ml-auto hidden md:block">
						<button className="h-full w-full" aria-label="Search">
							<MagnifyingGlassIcon width={'1.5rem'} height={'1.5rem'} />
						</button>
					</li>
					<li className="ml-6 hidden items-center justify-center md:flex">
						<Button
							type={'ghost'}
							color={theme === 'light' ? 'black' : 'white'}
						>
							<span className="text-xl">Add to server</span>
						</Button>
					</li>
				</ol>
			</nav>
		</>
	);
};
