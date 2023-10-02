'use client';
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
import { getInitials } from '~ui/utils/avatars';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~ui/components/primitives/ui/dropdown-menu';
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuList,
} from '~ui/components/primitives/ui/navigation-menu';
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '~ui/components/primitives/ui/avatar';
import { Button } from '~ui/components/primitives/ui/button';
import { AnswerOverflowLogo } from '~ui/components/primitives/base/AnswerOverflowLogo';
import { ServerPublic } from '~api/router/server/types';
import { GetStarted, SignInButton } from '../Callouts';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { DiscordIcon, GitHubIcon } from '../base/Icons';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { GITHUB_LINK } from '@answeroverflow/constants/src/links';
import { signOut } from 'next-auth/react';
import { ServerIcon } from '../ServerIcon';
import type { Session } from 'next-auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
			<Link href="/onboarding" className="w-full" prefetch={false}>
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
export const UserAvatar = ({
	user,
	tenant,
}: {
	user: Session['user'];
	tenant: ServerPublic | undefined;
}) => {
	const { theme, setTheme } = useTheme();
	const router = useRouter();
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger className="flex flex-row justify-center">
				<Avatar>
					<AvatarImage
						alt={user.name ?? 'Signed In User'}
						src={user.image ?? undefined}
					/>
					<AvatarFallback>
						{getInitials(user.name ?? 'Signed In User')}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="mr-4 mt-2 max-h-96 w-52">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{!tenant && (
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
						if (tenant) {
							const redirect =
								typeof window !== 'undefined' ? window.location.href : '';
							// navigate to /api/auth/tenant/signout?redirect=currentUrl
							router.push(`/api/auth/tenant/signout?redirect=${redirect}`);
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
	tenant: ServerPublic | undefined;
}) {
	const UserSection = () =>
		props.user ? (
			<UserAvatar user={props.user} tenant={props.tenant} />
		) : (
			<SignInButton />
		);

	const Desktop = () => (
		<>
			<NavigationMenuItem>
				<Button variant={'ghost'} size={'icon'} asChild>
					<Link href={'/search'}>
						<MagnifyingGlassIcon className="h-8 w-8" />
						<span className="sr-only">Search Answer Overflow</span>
					</Link>
				</Button>
			</NavigationMenuItem>
			<NavigationMenuItem>
				<ThemeSwitcher />
			</NavigationMenuItem>
			{!props.tenant && (
				<>
					<NavigationMenuItem>
						<Button variant={'ghost'} size={'icon'} asChild>
							<Link href={GITHUB_LINK} target="_blank">
								<GitHubIcon className="h-8 w-8" />
								<span className="sr-only">GitHub</span>
							</Link>
						</Button>
					</NavigationMenuItem>
					<NavigationMenuItem>
						<GetStarted location="Navbar" />
					</NavigationMenuItem>
				</>
			)}
		</>
	);

	return (
		<NavigationMenu className="relative min-h-[4rem] w-full sm:px-[4rem] md:py-2 2xl:px-[6rem]">
			<NavigationMenuList>
				<NavigationMenuItem>
					<Link href="/">
						{props.tenant ? (
							<div className="flex items-center space-x-2">
								<ServerIcon server={props.tenant} />
								<span className="font-bold">{props.tenant.name}</span>
							</div>
						) : (
							<>
								<div className={'w-40 md:w-56'}>
									<AnswerOverflowLogo width={'full'} />
								</div>
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
						<ThemeSwitcher />
					</NavigationMenuItem>
					<NavigationMenuItem className="md:hidden">
						<Button variant={'ghost'} size={'icon'}>
							<Link href={'/search'}>
								<MagnifyingGlassIcon className="h-8 w-8 " />
								<span className="sr-only">Search Answer Overflow</span>
							</Link>
						</Button>
					</NavigationMenuItem>
					<NavigationMenuItem>
						<UserSection />
					</NavigationMenuItem>
				</NavigationMenuList>
			</div>
		</NavigationMenu>
	);
}
