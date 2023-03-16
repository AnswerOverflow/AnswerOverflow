import type { User } from '@answeroverflow/api';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { trpc } from '~ui/utils/index';
import { AnswerOverflowLogo } from '../AnswerOverflowLogo';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { Button } from './Button';
import { signIn, signOut } from 'next-auth/react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import { Menu, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect, useRef } from 'react';
import { Avatar } from '../primitives/Avatar';
import { classNames } from '~ui/utils/styling';

const SignedInDropdownMenu = ({ signedInUser }: { signedInUser: User }) => (
	<Menu as="div" className="relative inline-block text-left">
		<Menu.Button>
			<div className="flex shrink-0 flex-row items-center rounded-md p-2 transition hover:bg-zinc-900/5 dark:hover:bg-white/5">
				<Avatar alt={signedInUser.name} size={'sm'} url={signedInUser.image} />
				<EllipsisVerticalIcon className="h-7 w-7 dark:text-white hover:dark:text-neutral-400" />
			</div>
		</Menu.Button>
		<Transition
			as={Fragment}
			enter="transition ease-out duration-100"
			enterFrom="transform opacity-0 scale-95"
			enterTo="transform opacity-100 scale-100"
			leave="transition ease-in duration-75"
			leaveFrom="transform opacity-100 scale-100"
			leaveTo="transform opacity-0 scale-95"
		>
			<Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black focus:outline-none dark:bg-neutral-800 dark:text-white">
				<div className="py-1">
					<Menu.Item>
						{({ active }) => (
							<Link
								href="/settings/servers"
								className={classNames(
									active
										? 'bg-gray-100 text-gray-900 dark:bg-neutral-700 dark:text-neutral-100'
										: 'text-gray-700 dark:text-neutral-300',
									'block px-4 py-2 text-sm',
								)}
							>
								My Servers
							</Link>
						)}
					</Menu.Item>
					<form method="POST" action="#">
						<Menu.Item>
							{({
								// TODO: Use this to show a selected state
								// eslint-disable-next-line @typescript-eslint/no-unused-vars
								active,
							}) => (
								<Button
									variant="outline"
									onClick={() => {
										async () => {
											await signOut();
										};
									}}
								>
									Sign out
								</Button>
							)}
						</Menu.Item>
					</form>
				</div>
			</Menu.Items>
		</Transition>
	</Menu>
);

export type NavbarProps = {
	user?: User;
	path?: string;
};

// TODO: Needs mobile styling
export const NavbarRenderer = ({ path, user }: NavbarProps) => {
	const [sticky, setSticky] = useState(false);
	const navbarRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleScroll = () => {
			if (window.pageYOffset > 100) {
				setSticky(true);
			} else {
				setSticky(false);
			}
		};

		window.addEventListener('scroll', handleScroll);

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}, []);

	return (
		<>
			{sticky && <div className="pt-[15.5rem]"></div>}
			<nav
				className={`${
					sticky
						? 'fixed top-0 left-0 backdrop-blur-md dark:bg-ao-black/75'
						: 'relative min-h-[4rem]'
				} z-50 flex w-full items-center`}
				ref={navbarRef}
			>
				<ol
					className={`mx-[4rem] hidden w-full flex-row ${
						sticky ? 'py-2' : 'py-8'
					} transition-all lg:flex 2xl:mx-[6rem]`}
				>
					<li>
						<Link
							href="/"
							className={path === '/' ? 'invisible' : ''}
							aria-label="Home"
						>
							<AnswerOverflowLogo />
						</Link>
					</li>
					<li className="ml-auto hidden items-center justify-center md:flex">
						<ThemeSwitcher />
					</li>
					<li className="mx-6 hidden md:flex">
						<Button aria-label="Search" variant="ghost" className="my-auto">
							<MagnifyingGlassIcon height={'1.5rem'} />
						</Button>
					</li>
					<li className="ml-6 hidden items-center justify-center md:flex">
						<Button variant="outline">Add to server</Button>
					</li>
					<li className="ml-6 hidden items-center justify-center md:flex">
						{user ? (
							<SignedInDropdownMenu signedInUser={user} />
						) : (
							// eslint-disable-next-line @typescript-eslint/no-misused-promises
							<Button variant="outline" onClick={() => signIn('discord')}>
								Login
							</Button>
						)}
					</li>
				</ol>
			</nav>
		</>
	);
};

export const Navbar = () => {
	const router = useRouter();
	const userQuery = trpc.auth.getSession.useQuery();
	const user = userQuery.data?.user;
	console.log(router.pathname);
	return <NavbarRenderer user={user} path={router.pathname} />;
};
