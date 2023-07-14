import type { Session } from 'next-auth';
import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/router';
import { trpc } from '~ui/utils/trpc';
import { GetStarted, SignInButton } from './Callouts';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Avatar, AvatarFallback, AvatarImage } from './base/Avatar';
import { DiscordIcon, GitHubIcon } from './base/Icons';
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuList,
	AnswerOverflowLogo,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuGroup,
	DropdownMenuSeparator,
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
} from './base';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { GITHUB_LINK } from '@answeroverflow/constants/src/links';
import { signOut } from 'next-auth/react';
import { useTenantContext } from '@answeroverflow/hooks';
import { ServerIcon } from './ServerIcon';

// TODO: Clean up this navbar area, bit of a mess
import {
	LuGithub,
	LuLogOut,
	LuPlus,
	LuLayoutDashboard,
	LuTwitter,
	LuMoon,
	LuSun,
} from 'react-icons/lu';
import { useTheme } from 'next-themes';
const MainSiteDropdownMenuGroup = () => (
	<>
		<DropdownMenuGroup>
			<DropdownMenuItem>
				<LuLayoutDashboard className="mr-2 h-4 w-4" />
				<Link href="/dashboard" className="w-full">
					Dashboard
				</Link>
			</DropdownMenuItem>
		</DropdownMenuGroup>
		<DropdownMenuItem>
			<LuPlus className="mr-2 h-4 w-4" />
			<Link href="/onboarding" className="w-full">
				Add To Server
			</Link>
		</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuItem>
			<LuGithub className="mr-2 h-4 w-4" />
			<Link
				href="https://www.github.com/answeroverflow/answeroverflow"
				target="_blank"
				className="w-full"
			>
				GitHub
			</Link>
		</DropdownMenuItem>
		<DropdownMenuItem>
			<DiscordIcon className="mr-2 h-4 w-4" />
			<Link
				href="https://discord.answeroverflow.com"
				target="_blank"
				className="w-full"
			>
				Discord
			</Link>
		</DropdownMenuItem>
		<DropdownMenuItem>
			<LuTwitter className="mr-2 h-4 w-4" />
			<Link
				href="https://www.twitter.com/answeroverflow"
				target="_blank"
				className="w-full"
			>
				Twitter
			</Link>
		</DropdownMenuItem>
	</>
);
export const UserAvatar = ({ user }: { user: Session['user'] }) => {
	const { theme, setTheme } = useTheme();
	const { isOnTenantSite } = useTenantContext();
	const { push } = useRouter();
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger className="flex flex-row justify-center">
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
			</DropdownMenuTrigger>
			<DropdownMenuContent className="mr-4 mt-2 max-h-96 w-52">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{!isOnTenantSite && (
					<>
						<MainSiteDropdownMenuGroup />
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuItem
					onClick={() => {
						setTheme(theme === 'dark' ? 'light' : 'dark');
					}}
				>
					<LuSun className="mr-2 block h-4 w-4 dark:hidden" />
					<LuMoon className="mr-2 hidden h-4 w-4 dark:block" />

					<span className="w-full">Change Theme</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						if (isOnTenantSite) {
							const redirect =
								typeof window !== 'undefined' ? window.location.href : '';
							// navigate to /api/auth/tenant/signout?redirect=currentUrl
							void push(`/api/auth/tenant/signout?redirect=${redirect}`);
						} else {
							void signOut({
								callbackUrl: '/',
							});
						}
					}}
				>
					<LuLogOut className="mr-2 h-4 w-4" />
					<span className="w-full">Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export function NavbarRenderer(props: {
	user: Session['user'] | null;
	path: string;
}) {
	const { isOnTenantSite, tenant } = useTenantContext();

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
			{!isOnTenantSite && (
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
		</>
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
			<div className="flex items-center gap-4">
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
					<NavigationMenuItem>
						<UserSection />
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
