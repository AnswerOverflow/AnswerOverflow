'use client';
import type { Session } from 'next-auth';
import { LuGithub, LuPlus, LuLayoutDashboard, LuTwitter } from 'react-icons/lu';
import { getInitials } from '../utils/avatars';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { DiscordIcon } from '../icons';
import Link from '../ui/link';
import type { ServerPublic } from '@answeroverflow/api/src/router/server/types';
import { ChangeThemeItem } from './change-theme-item';
import { LogoutItem } from './logout-item';

const MainSiteDropdownMenuGroup = () => (
	<>
		<DropdownMenuGroup>
			<DropdownMenuItem>
				<LuLayoutDashboard className="mr-2 size-4" />
				<Link href="/dashboard" className="w-full" prefetch={false}>
					Dashboard
				</Link>
			</DropdownMenuItem>
		</DropdownMenuGroup>
		<DropdownMenuItem>
			<LuPlus className="mr-2 size-4" />
			<Link href="/onboarding" className="w-full" prefetch={false}>
				Add To Server
			</Link>
		</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuItem>
			<LuGithub className="mr-2 size-4" />
			<Link
				href="https://www.github.com/answeroverflow/answeroverflow"
				target="_blank"
				className="w-full"
			>
				GitHub
			</Link>
		</DropdownMenuItem>
		<DropdownMenuItem>
			<DiscordIcon className="mr-2 size-4" />
			<Link
				href="https://discord.answeroverflow.com"
				target="_blank"
				className="w-full"
			>
				Discord
			</Link>
		</DropdownMenuItem>
		<DropdownMenuItem>
			<LuTwitter className="mr-2 size-4" />
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
