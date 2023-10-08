import type { Session } from 'next-auth';
import Link from 'next/link';
import React, { Suspense } from 'react';
import { GetStarted } from '../Callouts';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { DiscordIcon, GitHubIcon } from '../base/Icons';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { GITHUB_LINK } from '@answeroverflow/constants/src/links';
import { ServerIcon } from '../ServerIcon';

// TODO: Clean up this navbar area, bit of a mess
import { LuGithub, LuPlus, LuLayoutDashboard, LuTwitter } from 'react-icons/lu';
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
import { AnswerOverflowLogo } from '~ui/components/primitives/base/AnswerOverflowLogo';
import { SignInButton } from '~ui/components/primitives/navbar/sign-in-button';
import { ServerPublic } from '~api/router/server/types';
import { headers } from 'next/headers';
import { ChangeThemeItem } from '~ui/components/primitives/navbar/change-theme-item';
import { LogoutItem } from '~ui/components/primitives/navbar/logout-item';
import { LinkButton } from '~ui/components/primitives/base/LinkButton';
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
export const UserAvatar = (props: {
	user: Session['user'];
	isOnTenantSite: boolean;
}) => {
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger className="flex flex-row justify-center">
				<Avatar>
					<AvatarImage
						alt={props.user.name ?? 'Signed In User'}
						src={props.user.image ?? undefined}
					/>
					<AvatarFallback>
						{getInitials(props.user.name ?? 'Signed In User')}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="mr-4 mt-2 max-h-96 w-52">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{!props.isOnTenantSite && (
					<>
						<MainSiteDropdownMenuGroup />
						<DropdownMenuSeparator />
					</>
				)}
				<ChangeThemeItem />
				<LogoutItem isOnTenantSite={props.isOnTenantSite} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

import { getServerSession } from '@answeroverflow/auth';
export async function UserSection(props: { isOnTenantSite: boolean }) {
	const session = await getServerSession();
	if (!session) {
		return <SignInButton />;
	}
	return (
		<UserAvatar user={session.user} isOnTenantSite={props.isOnTenantSite} />
	);
}

export function NavbarRenderer(props: {
	path: string;
	isOnTenantSite: boolean;
	tenant: ServerPublic | undefined;
}) {
	const { isOnTenantSite, tenant } = props;

	const Desktop = () => (
		<>
			<NavigationMenuItem>
				<LinkButton variant={'ghost'} size={'icon'} href={'/search'}>
					<MagnifyingGlassIcon className="h-8 w-8" />
					<span className="sr-only">Search Answer Overflow</span>
				</LinkButton>
			</NavigationMenuItem>
			<NavigationMenuItem>
				<ThemeSwitcher />
			</NavigationMenuItem>
			{!isOnTenantSite && (
				<>
					<NavigationMenuItem>
						<LinkButton
							variant={'ghost'}
							size={'icon'}
							href={GITHUB_LINK}
							target="_blank"
						>
							<GitHubIcon className="h-8 w-8" />
							<span className="sr-only">GitHub</span>
						</LinkButton>
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
						{tenant ? (
							<div className="flex items-center space-x-2">
								<ServerIcon server={tenant} />
								<span className="font-bold">{tenant.name}</span>
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
						<LinkButton variant={'ghost'} size={'icon'} href={'/search'}>
							<MagnifyingGlassIcon className="h-8 w-8 " />
							<span className="sr-only">Search Answer Overflow</span>
						</LinkButton>
					</NavigationMenuItem>
					<NavigationMenuItem>
						<Suspense fallback={<SignInButton />}>
							<UserSection isOnTenantSite={isOnTenantSite} />
						</Suspense>
					</NavigationMenuItem>
				</NavigationMenuList>
			</div>
		</NavigationMenu>
	);
}

export const Navbar = () => {
	const headersList = headers();
	const pathname = headersList.get('x-invoke-path') ?? '';
	return (
		<NavbarRenderer path={pathname} isOnTenantSite={false} tenant={undefined} />
	);
};
