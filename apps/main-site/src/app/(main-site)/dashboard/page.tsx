"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { useSession } from "@packages/ui/components/convex-client-provider";
import { Input } from "@packages/ui/components/input";
import { Link } from "@packages/ui/components/link";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { useQueryState } from "nuqs";
import { ServerCard } from "../../../components/server-card";
import { authClient } from "../../../lib/auth-client";

export default function DashboardHome() {
	const { data: session, isPending } = useSession({ allowAnonymous: false });
	const getUserServers = useAction(api.authenticated.dashboard.getUserServers);
	const [searchQuery, setSearchQuery] = useQueryState("search", {
		defaultValue: "",
	});

	const {
		data: servers,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["dashboard-servers"],
		queryFn: async () => {
			if (!session?.user) {
				throw new Error("Not authenticated");
			}
			return await getUserServers({});
		},
		enabled: !isPending && !!session?.user,
		refetchOnWindowFocus: true,
	});

	const filteredServers =
		servers?.filter((server) =>
			server.name.toLowerCase().includes((searchQuery ?? "").toLowerCase()),
		) ?? [];

	if (isPending || isLoading) {
		return (
			<main className="max-w-6xl mx-auto p-8">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-3xl font-bold">Your Servers</h1>
				</div>
				<div className="mb-6">
					<Input
						type="search"
						value={searchQuery ?? ""}
						onChange={(e) => setSearchQuery(e.target.value || null)}
						placeholder="Search servers..."
						className="w-full max-w-md"
					/>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{Array.from({ length: 12 }).map((_, i) => (
						<div
							key={`skeleton-${i}`}
							className="flex max-w-md flex-col gap-3 rounded-lg bg-white dark:bg-black/40 pb-4 shadow-lg overflow-hidden"
						>
							{/* Hero section skeleton */}
							<div className="relative mx-auto aspect-video w-full rounded-t-lg">
								<Skeleton className="h-full w-full rounded-t-lg" />
							</div>
							{/* Title and CTA section skeleton */}
							<div className="flex w-full flex-row items-center justify-between align-bottom px-4">
								<div className="flex flex-col pr-4 text-left gap-2">
									<Skeleton className="h-5 w-32" />
									<Skeleton className="h-4 w-24" />
								</div>
								<Skeleton className="h-10 w-20" />
							</div>
						</div>
					))}
				</div>
			</main>
		);
	}

	if (!session?.user) {
		return (
			<main className="max-w-6xl mx-auto p-8">
				<h1 className="text-3xl font-bold mb-6">Your Servers</h1>
				<Card>
					<CardHeader>
						<CardTitle>Sign in required</CardTitle>
						<CardDescription>
							Please sign in with Discord to manage your servers.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							onClick={async () => {
								await authClient.signIn.social({
									provider: "discord",
									callbackURL: window.location.href,
								});
							}}
						>
							Sign in with Discord
						</Button>
					</CardContent>
				</Card>
			</main>
		);
	}

	if (error) {
		return (
			<main className="max-w-6xl mx-auto p-8">
				<h1 className="text-3xl font-bold mb-6">Your Servers</h1>
				<div className="text-destructive">
					Error loading servers:{" "}
					{error instanceof Error ? error.message : "Unknown error"}
				</div>
			</main>
		);
	}

	if (!servers || servers.length === 0) {
		return (
			<main className="max-w-6xl mx-auto p-8">
				<h1 className="text-3xl font-bold mb-6">Your Servers</h1>
				<Card>
					<CardHeader>
						<CardTitle>No servers found</CardTitle>
						<CardDescription>
							You don't have permission to manage any Discord servers, or you
							haven't connected your Discord account.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild>
							<Link href="/dashboard/onboarding">Get Started</Link>
						</Button>
					</CardContent>
				</Card>
			</main>
		);
	}

	return (
		<main className="max-w-6xl mx-auto p-8">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold">Your Servers</h1>
			</div>
			<div className="mb-6">
				<Input
					type="search"
					autoFocus
					value={searchQuery ?? ""}
					onChange={(e) => setSearchQuery(e.target.value || null)}
					placeholder="Search servers..."
					className="w-full max-w-md"
				/>
			</div>
			{filteredServers.length === 0 && servers && servers.length > 0 ? (
				<div className="text-muted-foreground">
					No servers found matching &quot;{searchQuery ?? ""}&quot;
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredServers.map((server) => (
						<ServerCard
							key={server.discordId}
							server={{
								discordId: BigInt(server.discordId),
								name: server.name,
								icon: server.icon,
								highestRole: server.highestRole,
								hasBot: server.hasBot,
								aoServerId: server.aoServerId,
							}}
						/>
					))}
				</div>
			)}
		</main>
	);
}
