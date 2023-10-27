'use client';
import { Suspense } from 'react';
import type { Session } from 'next-auth';
import { DiscordIcon } from '../base/Icons';
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
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '~ui/components/primitives/ui/avatar';
import { SignInButton } from '~ui/components/primitives/navbar/sign-in-button';
import { ChangeThemeItem } from '~ui/components/primitives/navbar/change-theme-item';
import { LogoutItem } from '~ui/components/primitives/navbar/logout-item';

const MainSiteDropdownMenuGroup = () => (
	<>
		<DropdownMenuGroup>
			<DropdownMenuItem>
				<LuLayoutDashboard className="mr-2 h-4 w-4" />
				<Link href="/dashboard" className="w-full" prefetch={false}>
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
	tenant: ServerPublic | undefined;
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
				{!props.tenant && (
					<>
						<MainSiteDropdownMenuGroup />
						<DropdownMenuSeparator />
					</>
				)}
				<ChangeThemeItem />
				<LogoutItem tenant={props.tenant} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

import { getServerSession } from '@answeroverflow/auth';
import Link from '~ui/components/primitives/base/Link';
import type { ServerPublic } from '@answeroverflow/api/src/router/server/types';
