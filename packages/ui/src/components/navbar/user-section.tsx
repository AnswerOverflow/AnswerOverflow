"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ImpersonateDialog } from "../admin/impersonate-dialog";
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
	isAdmin,
	onOpenImpersonate,
}: {
	user: User;
	onSignOut?: () => void | Promise<void>;
	showDashboardLink?: boolean;
	isAdmin?: boolean;
	onOpenImpersonate?: () => void;
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
			<DropdownMenuContent className="mr-4 mt-4 w-40">
				{showDashboardLink && (
					<>
						<DropdownMenuItem asChild>
							<Link href="/dashboard">Dashboard</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				{isAdmin && (
					<>
						<DropdownMenuItem onClick={onOpenImpersonate}>
							Impersonate User
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuItem asChild>
					<Link href="/dashboard/settings">Settings</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
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
	const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false);
	const {
		data: session,
		isPending,
		refetch,
	} = useSession({
		allowAnonymous: false,
	});
	const isOnDashboard = pathname?.startsWith("/dashboard");

	const isAdmin = session?.user?.role === "admin";

	if (isPending) {
		return <UserSectionSkeleton />;
	}

	const handleSignIn = async () => {
		await authClient.signIn.social({
			provider: "discord",
			callbackURL: window.location.href,
		});
	};

	const handleSignOut = async () => {
		await authClient.signOut();

		const isDevAuth =
			(window.location.href.includes("localhost") ||
				window.location.href.includes("ao.tail5665af.ts.net")) &&
			process.env.NEXT_PUBLIC_CONVEX_URL?.includes("api.answeroverflow.com");

		if (isDevAuth) {
			await fetch("/api/dev/auth/clear-cookies", {
				method: "POST",
				credentials: "include",
			});
		}

		refetch();
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
				isAdmin={isAdmin === true}
				onOpenImpersonate={() => setImpersonateDialogOpen(true)}
			/>
			{isAdmin && (
				<ImpersonateDialog
					open={impersonateDialogOpen}
					onOpenChange={setImpersonateDialogOpen}
				/>
			)}
		</>
	);
}

export function UserSectionSkeleton() {
	return <Skeleton className="size-10 rounded-full" />;
}
