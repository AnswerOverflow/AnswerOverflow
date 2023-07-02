import type { User } from '@answeroverflow/api';
import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/router';
import { trpc } from '~ui/utils/trpc';
import { GetStarted, SignInButton } from './Callouts';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Avatar, AvatarFallback, AvatarImage } from './base/Avatar';
import { GitHubIcon } from './base/Icons';
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuList,
	AnswerOverflowLogo,
	LinkButton,
	Popover,
	PopoverTrigger,
	PopoverContent,
	Button,
} from './base';
import {
	Bars3Icon,
	ChevronDownIcon,
	MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { ThemeIcon } from './ThemeSwitcher';
import { GITHUB_LINK } from '@answeroverflow/constants/src/links';
import { signIn, signOut } from 'next-auth/react';
import { useTenantContext } from '@answeroverflow/hooks';
import { ServerIcon } from './ServerIcon';
// TODO: Clean up this navbar area, bit of a mess

export const UserAvatar = ({ user }: { user: User }) => (
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
	const tenant = useTenantContext();

	const UserSection = () =>
		props.user ? <UserAvatar user={props.user} /> : <SignInButton />;

	const Desktop = () => (
		<>
			<NavigationMenuItem>
				<Link href={'/search'}>
					<MagnifyingGlassIcon className="h-8 w-8 text-ao-black hover:text-neutral-300 dark:text-ao-white dark:hover:text-neutral-400" />
					<span className="sr-only">Search Answer Overflow</span>
				</Link>
			</NavigationMenuItem>
			<NavigationMenuItem>
				<ThemeSwitcher />
			</NavigationMenuItem>
			{tenant === undefined && (
				<>
					<NavigationMenuItem>
						<Link href={GITHUB_LINK} target="_blank">
							<GitHubIcon className="h-8 w-8 text-ao-black hover:fill-neutral-300 dark:text-ao-white" />
							<span className="sr-only">GitHub</span>
						</Link>
					</NavigationMenuItem>
					<NavigationMenuItem>
						<GetStarted location="Navbar" />
					</NavigationMenuItem>
				</>
			)}
			<NavigationMenuItem>
				<UserSection />
			</NavigationMenuItem>
		</>
	);

	const Mobile = () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" className="w-10 rounded-full border-0 p-0">
					<Bars3Icon className="h-6 w-6" />
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
									await signOut();
								} else {
									await signIn('discord');
								}
							}}
						>
							{props.user ? 'Sign Out' : 'Sign In'}
						</Button>
					</div>
					{tenant === undefined && (
						<>
							<div className="flex flex-row space-y-2">
								<LinkButton
									variant="ghost"
									className="w-full items-start justify-start"
									href={'/onboarding'}
								>
									Get Started
								</LinkButton>
							</div>
							<div className="flex flex-row space-y-2">
								<LinkButton
									variant="ghost"
									className="w-full items-start justify-between"
									href={GITHUB_LINK}
								>
									GitHub
									<GitHubIcon className="h-6 w-6" />
								</LinkButton>
							</div>
						</>
					)}
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
		<NavigationMenu className="relative min-h-[4rem] py-2 sm:px-[4rem] 2xl:px-[6rem]">
			<NavigationMenuList>
				<NavigationMenuItem>
					<Link href="/">
						{tenant ? (
							<div className="flex items-center space-x-2">
								<ServerIcon server={tenant} />
								<span className="font-bold text-ao-black dark:text-ao-white">
									{tenant.name}
								</span>
							</div>
						) : (
							<>
								<AnswerOverflowLogo />
								<span className="sr-only">Answer Overflow Logo</span>
							</>
						)}
					</Link>
				</NavigationMenuItem>
			</NavigationMenuList>
			<div className="flex items-center">
				<NavigationMenuList className="hidden md:flex">
					<Desktop />
				</NavigationMenuList>
				<NavigationMenuList>
					<NavigationMenuItem className="md:hidden">
						<Link href={'/search'}>
							<MagnifyingGlassIcon className="h-8 w-8 text-ao-black hover:text-neutral-300 dark:text-ao-white dark:hover:text-neutral-400" />
							<span className="sr-only">Search Answer Overflow</span>
						</Link>
					</NavigationMenuItem>
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
