"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { AnswerOverflowLogo } from "@packages/ui/components/answer-overflow-logo";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { useSession } from "@packages/ui/components/convex-client-provider";
import { Input } from "@packages/ui/components/input";
import { Link } from "@packages/ui/components/link";
import { Skeleton } from "@packages/ui/components/skeleton";
import { ThreadCard } from "@packages/ui/components/thread-card";
import { DiscordIcon } from "@packages/ui/icons/index";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { ServerCard } from "../../../components/server-card";
import { useAuthClient } from "../../../lib/auth-client";

export function DashboardClient({
	initialThreads,
}: {
	initialThreads: SearchResult[];
}) {
	const authClient = useAuthClient();
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
							<div className="relative mx-auto aspect-video w-full rounded-t-lg">
								<Skeleton className="h-full w-full rounded-t-lg" />
							</div>
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
			<SignedOutDashboard
				authClient={authClient}
				initialThreads={initialThreads}
			/>
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

function ScrollingThreads({ threads }: { threads: SearchResult[] }) {
	if (threads.length === 0) {
		return null;
	}

	const duplicatedItems = [...threads, ...threads];

	return (
		<div
			className="relative h-full w-full max-w-md overflow-hidden"
			style={{
				maskImage:
					"linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
				WebkitMaskImage:
					"linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
			}}
		>
			<div
				className="space-y-4 py-4"
				style={{ animation: "scroll-up 40s linear infinite" }}
			>
				{duplicatedItems.map((result, index) => (
					<ThreadCard
						key={`${result.message.message.id}-${index}`}
						result={result}
					/>
				))}
			</div>
		</div>
	);
}

function SignedOutDashboard({
	authClient,
	initialThreads,
}: {
	authClient: ReturnType<typeof useAuthClient>;
	initialThreads: SearchResult[];
}) {
	return (
		<main className="h-screen flex overflow-hidden">
			<div className="hidden lg:flex lg:w-1/2 bg-primary/5 dark:bg-primary/10 items-center justify-center p-12 overflow-hidden">
				<ScrollingThreads threads={initialThreads} />
			</div>

			<div className="w-full lg:w-1/2 flex items-center justify-center p-8">
				<div className="w-full max-w-sm">
					<div className="flex flex-col items-center mb-8">
						<Link href="/" className="mb-6">
							<AnswerOverflowLogo width={160} />
							<span className="sr-only">Answer Overflow</span>
						</Link>
						<p className="text-sm text-muted-foreground">Sign in to continue</p>
					</div>

					<Button
						size="lg"
						className="w-full gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white"
						onClick={async () => {
							await authClient.signIn.social({
								provider: "discord",
								callbackURL: window.location.href,
							});
						}}
					>
						<DiscordIcon className="size-5" />
						Sign in with Discord
					</Button>

					<p className="text-center text-sm text-muted-foreground mt-8">
						Need help? Add me on Discord{" "}
						<button
							type="button"
							className="text-foreground hover:underline cursor-pointer"
							onClick={() => {
								navigator.clipboard.writeText("rhyssul");
								toast.success("Copied to clipboard");
							}}
						>
							rhyssul
						</button>{" "}
						or email{" "}
						<button
							type="button"
							className="text-foreground hover:underline cursor-pointer"
							onClick={() => {
								navigator.clipboard.writeText("rhys@answeroverflow.com");
								toast.success("Copied to clipboard");
							}}
						>
							rhys@answeroverflow.com
						</button>
					</p>
				</div>
			</div>
		</main>
	);
}
