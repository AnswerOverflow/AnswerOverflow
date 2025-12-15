"use client";

import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { useAuthClient, useSession } from "../convex-client-provider";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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

function UserAvatar({
	user,
	onSignOut,
	showDashboardLink,
}: {
	user: User;
	onSignOut?: () => void | Promise<void>;
	showDashboardLink?: boolean;
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
			<DropdownMenuContent className="z-[100] mr-4 mt-4 w-32">
				{showDashboardLink && (
					<>
						<DropdownMenuItem asChild className="md:hidden">
							<Link href="/dashboard">Dashboard</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator className="md:hidden" />
					</>
				)}
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
	const pathname = usePathname();
	const authClient = useAuthClient();
	const {
		data: session,
		isPending,
		refetch,
	} = useSession({
		allowAnonymous: false,
	});
	const isOnDashboard = pathname?.startsWith("/dashboard");

	if (isPending) {
		return <UserSectionSkeleton />;
	}

	const handleSignIn = async () => {
		if (
			window.location.href.includes("localhost") &&
			process.env.NEXT_PUBLIC_CONVEX_URL?.includes("api.answeroverflow.com")
		) {
			window.location.href = `/dev-auth/receive?redirect=${encodeURIComponent(window.location.pathname)}`;
			return;
		}
		await authClient.signIn.social({
			provider: "discord",
			callbackURL: window.location.href,
		});
	};

	const handleSignOut = async () => {
		await authClient.signOut();

		const isDevAuth =
			window.location.href.includes("localhost") &&
			process.env.NEXT_PUBLIC_CONVEX_URL?.includes("api.answeroverflow.com");

		if (isDevAuth) {
			await fetch("/api/dev/auth/clear-cookies", {
				method: "POST",
				credentials: "include",
			});
		}

		await refetch();
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

	return (
		<>
			{!isOnDashboard && (
				<LinkButton
					variant="outline"
					href="/dashboard"
					className="hidden md:flex"
				>
					Dashboard
				</LinkButton>
			)}
			<UserAvatar
				user={user}
				onSignOut={handleSignOut}
				showDashboardLink={!isOnDashboard}
			/>
		</>
	);
}

export function UserSectionSkeleton() {
	return <Skeleton className="size-10 rounded-full" />;
}
