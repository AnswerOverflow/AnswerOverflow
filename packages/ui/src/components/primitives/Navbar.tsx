import type { User } from '@answeroverflow/api';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { trpc } from '~ui/utils/trpc';
import { AnswerOverflowLogo } from '../AnswerOverflowLogo';
import { GetStarted, SignInButton } from '../Callouts';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { Avatar, AvatarFallback, AvatarImage } from './Avatar';
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuList,
} from './NavigationMenu';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverTrigger, PopoverContent } from './Popover';
import { ThemeIcon } from '../ThemeSwitcher';
import { Button } from './Button';
import { LinkButton } from './LinkButton';
import { GETTING_STARTED_URL } from '@answeroverflow/constants/src/links';
import { signIn, signOut } from 'next-auth/react';
// TODO: Clean up this navbar area, bit of a mess

const UserAvatar = ({ user }: { user: User }) => (
	<Popover>
		<PopoverTrigger asChild>
			<Button
				variant="outline"
				className="h-16 rounded-full border-0 bg-inherit dark:bg-inherit"
			>
				<Avatar>
					<AvatarImage
						alt={user.name ?? 'Signed In User'}
						src={user.image ?? undefined}
					/>
					<AvatarFallback>
						{(user.name ?? 'Signed In User')
							.split(' ')
							.map((word) => word.at(0)?.toUpperCase())}
					</AvatarFallback>
				</Avatar>
				<ChevronDownIcon className="h-4 w-4" />
			</Button>
		</PopoverTrigger>
		<PopoverContent className="w-40">
			<div className="grid gap-4">
				<div className="flex flex-row space-y-2">
					<Button
						variant="ghost"
						className="w-full"
						size="sm"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onClick={async () => {
							await signOut();
						}}
					>
						Sign Out
					</Button>
				</div>
			</div>
		</PopoverContent>
	</Popover>
);

export function NavbarRenderer(props: { user: User | null; path: string }) {
	const [sticky, setSticky] = useState(false);
	useEffect(() => {
		const handleScroll = () => {
			if (window.pageYOffset > 80) {
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

	const UserSection = () =>
		props.user ? <UserAvatar user={props.user} /> : <SignInButton />;

	const Desktop = () => (
		<>
			<NavigationMenuItem>
				<ThemeSwitcher />
			</NavigationMenuItem>
			<NavigationMenuItem>
				<GetStarted />
			</NavigationMenuItem>
			<NavigationMenuItem>
				<UserSection />
			</NavigationMenuItem>
		</>
	);

	const Mobile = () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" className="w-10 rounded-full p-0">
					<ChevronDownIcon className="h-4 w-4" />
					<span className="sr-only">Open popover</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-40">
				<div className="grid gap-4">
					<div className="flex flex-row space-y-2">
						<Button
							variant="ghost"
							className="w-full items-start justify-start"
							// eslint-disable-next-line @typescript-eslint/no-misused-promises
							onClick={async () => {
								if (props.user) {
									console.log('signing out');
									await signOut();
								} else {
									await signIn('discord');
								}
							}}
						>
							{props.user ? 'Sign Out' : 'Sign In'}
						</Button>
					</div>
					<div className="flex flex-row space-y-2">
						<LinkButton
							variant="ghost"
							className="w-full items-start justify-start"
							href={GETTING_STARTED_URL}
						>
							Get Started
						</LinkButton>
					</div>
					<div className="flex w-full flex-row space-y-2">
						<ThemeSwitcher
							Switcher={({ toggleTheme }) => (
								<Button
									variant="ghost"
									onClick={toggleTheme}
									className="text-left"
								>
									Change Theme
									<ThemeIcon />
								</Button>
							)}
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);

	return (
		<NavigationMenu
			className={
				sticky
					? 'fixed top-0 left-0 w-full backdrop-blur-md dark:bg-ao-black/75'
					: 'relative min-h-[4rem]'
			}
		>
			<NavigationMenuList>
				<NavigationMenuItem>
					<Link href="/">
						<AnswerOverflowLogo />
						<span className="sr-only">Answer Overflow Logo</span>
					</Link>
				</NavigationMenuItem>
			</NavigationMenuList>
			<div className="flex items-center">
				<NavigationMenuList className="hidden md:flex">
					<Desktop />
				</NavigationMenuList>
				<NavigationMenuList>
					<NavigationMenuItem className="md:hidden">
						<Mobile />
					</NavigationMenuItem>
				</NavigationMenuList>
			</div>
		</NavigationMenu>
	);
}
export const Navbar = () => {
	const router = useRouter();
	const userQuery = trpc.auth.getSession.useQuery();
	const user = userQuery.data?.user;
	return <NavbarRenderer user={user ?? null} path={router.pathname} />;
};
