"use client";

import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { authClient, useSession } from "../convex-client-provider";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../dropdown-menu";
import { Link } from "../link";
import { LinkButton } from "../link-button";
import { Skeleton } from "../skeleton";

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export interface User {
	name?: string | null;
	image?: string | null;
	email?: string | null;
}

export interface UserSectionProps {
	showSignIn?: boolean;
}

function ChangeThemeItem() {
	const { theme, setTheme } = useTheme();

	return (
		<DropdownMenuItem
			onClick={() => {
				setTheme(theme === "dark" ? "light" : "dark");
			}}
		>
			<Sun className="mr-2 block h-4 w-4 dark:hidden" />
			<Moon className="mr-2 hidden h-4 w-4 dark:block" />
			<span className="w-full">Change Theme</span>
		</DropdownMenuItem>
	);
}

function UserAvatar({
	user,
	onSignOut,
}: {
	user: User;
	onSignOut?: () => void | Promise<void>;
}) {
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger className="flex flex-row justify-center">
				<Avatar>
					<AvatarImage
						alt={user.name ?? "Signed In User"}
						src={user.image ?? undefined}
					/>
					<AvatarFallback>{getInitials(user.name ?? "User")}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="mr-4 mt-2 max-h-96 w-52">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<Link href="/dashboard" className="w-full">
							Dashboard
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<ChangeThemeItem />
				<DropdownMenuItem
					onClick={() => {
						if (onSignOut) {
							void onSignOut();
						}
					}}
				>
					Sign Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function SignInButton({
	onSignIn,
	href,
}: {
	onSignIn?: () => void;
	href?: string;
}) {
	if (href) {
		return (
			<LinkButton variant="outline" href={href}>
				Sign In
			</LinkButton>
		);
	}
	return (
		<button
			onClick={onSignIn}
			className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
		>
			Sign In
		</button>
	);
}

export function UserSection({ showSignIn = true }: UserSectionProps) {
	const router = useRouter();
	const { data: session } = useSession({ allowAnonymous: false });

	const handleSignIn = async () => {
		if (
			window.location.href.includes("localhost") &&
			process.env.NEXT_PUBLIC_CONVEX_URL?.includes("api.answeroverflow.com")
		) {
			window.location.href =
				"https://new.answeroverflow.com/dev-auth?redirect=" +
				window.location.href;
			return;
		}
		await authClient.signIn.social({
			provider: "discord",
			callbackURL: window.location.href,
		});
	};

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/");
	};

	const user = session?.user
		? {
				name: session.user.name ?? null,
				image: session.user.image ?? null,
				email: session.user.email ?? null,
			}
		: null;

	if (!user && showSignIn) {
		return <SignInButton onSignIn={handleSignIn} />;
	}

	if (!user) {
		return null;
	}

	return <UserAvatar user={user} onSignOut={handleSignOut} />;
}

export function UserSectionSkeleton() {
	return <Skeleton className="size-10 rounded-full" />;
}
