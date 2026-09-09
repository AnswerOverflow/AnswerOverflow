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
import { Skeleton, SkeletonProvider, useIsSkeleton } from "../skeleton";

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

function SignInButton() {
	return (
		<LinkButton variant="outline" href="/dashboard">
			Sign In
		</LinkButton>
	);
}

function DashboardButton() {
	return (
		<LinkButton variant="outline" href="/dashboard" className="hidden md:flex">
			Dashboard
		</LinkButton>
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

	const handleSignOut = async () => {
		await authClient.signOut();

		const isDevAuth =
			(window.location.href.includes("localhost") ||
				window.location.href.includes("ao.tail5665af.ts.net") ||
				window.location.href.includes(".answeroverflow.dev")) &&
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

	return (
		<SkeletonProvider isLoading={isPending}>
			<UserSectionContent
				user={user}
				showSignIn={showSignIn}
				isOnDashboard={isOnDashboard ?? false}
				isAdmin={isAdmin === true}
				onSignOut={handleSignOut}
				impersonateDialogOpen={impersonateDialogOpen}
				setImpersonateDialogOpen={setImpersonateDialogOpen}
			/>
		</SkeletonProvider>
	);
}

function UserSectionContent({
	user,
	showSignIn,
	isOnDashboard,
	isAdmin,
	onSignOut,
	impersonateDialogOpen,
	setImpersonateDialogOpen,
}: {
	user: User | null;
	showSignIn: boolean;
	isOnDashboard: boolean;
	isAdmin: boolean;
	onSignOut: () => void;
	impersonateDialogOpen: boolean;
	setImpersonateDialogOpen: (open: boolean) => void;
}) {
	const isSkeleton = useIsSkeleton();

	if (!user) {
		if (showSignIn) {
			return <SignInButton />;
		}
		if (isSkeleton) {
			return <Skeleton className="h-[38px] w-[82px] rounded-md" />;
		}
		return null;
	}

	return (
		<>
			{!isOnDashboard && <DashboardButton />}
			<UserAvatar
				user={user}
				onSignOut={onSignOut}
				showDashboardLink={!isOnDashboard}
				isAdmin={isAdmin}
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
	return (
		<SkeletonProvider isLoading={true}>
			<UserSectionContent
				user={null}
				showSignIn={true}
				isOnDashboard={false}
				isAdmin={false}
				onSignOut={() => {}}
				impersonateDialogOpen={false}
				setImpersonateDialogOpen={() => {}}
			/>
		</SkeletonProvider>
	);
}
