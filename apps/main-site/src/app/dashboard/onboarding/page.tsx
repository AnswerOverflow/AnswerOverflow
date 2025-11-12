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
import { BotPermissionsDisplay } from "@packages/ui/components/bot-permissions";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "../../../lib/auth-client";

type OnboardingStep = "auth" | "install" | "complete";

export default function OnboardingPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const serverId = searchParams.get("serverId");
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const getUserServers = useAction(api.public.dashboard.getUserServers);
	const trackBotAddClick = useAction(api.public.dashboard.trackBotAddClick);
	const [step, setStep] = useState<OnboardingStep>("auth");
	const [installingServerId, setInstallingServerId] = useState<string | null>(
		null,
	);

	const {
		data: servers,
		isLoading: isServersLoading,
		refetch: refetchServers,
	} = useQuery({
		queryKey: ["dashboard-servers"],
		queryFn: async () => {
			if (!session?.user) {
				throw new Error("Not authenticated");
			}
			return await getUserServers({});
		},
		enabled: !isSessionPending && !!session?.user,
	});

	const selectedServer = servers?.find((s) => s.discordId === serverId);

	// Determine current step
	useEffect(() => {
		if (isSessionPending) {
			setStep("auth");
			return;
		}

		if (!session?.user) {
			setStep("auth");
			return;
		}

		// If authenticated but no serverId, redirect to dashboard
		if (!serverId) {
			router.push("/dashboard");
			return;
		}

		// If authenticated and has serverId, go to install step
		if (step === "auth" && serverId) {
			setStep("install");
		}
	}, [session, isSessionPending, serverId, step, router]);

	// Check if bot was added (poll servers)
	useEffect(() => {
		if (step === "install" && installingServerId && selectedServer) {
			let attempts = 0;
			const maxAttempts = 40; // 2 minutes max (40 * 3 seconds)

			const interval = setInterval(async () => {
				attempts++;
				const updatedServers = await refetchServers();
				const server = updatedServers.data?.find(
					(s) => s.discordId === installingServerId,
				);
				if (server?.hasBot && server.aoServerId) {
					setStep("complete");
					clearInterval(interval);
				} else if (attempts >= maxAttempts) {
					clearInterval(interval);
					// Still show completion step even if polling timed out
					// User can manually refresh or navigate
				}
			}, 3000); // Check every 3 seconds

			return () => clearInterval(interval);
		}
	}, [step, installingServerId, selectedServer, refetchServers]);

	const handleInstallClick = async (discordId: string) => {
		const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
		if (!discordClientId) {
			return;
		}

		// Track that the user clicked the "Add to Server" button
		try {
			await trackBotAddClick({ serverDiscordId: discordId });
		} catch (error) {
			// Don't block the user if tracking fails
			console.error("Failed to track bot add click:", error);
		}

		const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${discordClientId}&permissions=328565083201&scope=bot+applications.commands&guild_id=${discordId}&disable_guild_select=true`;
		window.open(inviteUrl, "_blank", "noopener,noreferrer");
		setInstallingServerId(discordId);
	};

	if (isSessionPending || isServersLoading) {
		return (
			<main className="flex items-center justify-center p-4 md:p-8">
				<div className="w-full max-w-2xl space-y-6">
					<Skeleton className="h-12 w-64" />
					<Skeleton className="h-96 w-full" />
				</div>
			</main>
		);
	}

	// Step 1: Authentication
	if (step === "auth" || !session?.user) {
		return (
			<main className="flex items-center justify-center p-4 md:p-8">
				<div className="w-full max-w-2xl">
					<Card>
						<CardHeader className="text-center">
							<CardTitle className="text-3xl">
								Welcome to Answer Overflow
							</CardTitle>
							<CardDescription className="text-base">
								Get started by connecting your Discord account
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col items-center gap-6">
							<p className="text-muted-foreground text-center">
								To add Answer Overflow to your Discord server, you need to sign
								in with Discord. This allows us to see which servers you manage
								and help you set up the bot.
							</p>
							<Button
								onClick={async () => {
									const callbackUrl = serverId
										? `/dashboard/onboarding?serverId=${serverId}`
										: "/dashboard";
									await authClient.signIn.social({
										provider: "discord",
										callbackURL: callbackUrl,
									});
								}}
								size="lg"
							>
								Sign in with Discord
							</Button>
						</CardContent>
					</Card>
				</div>
			</main>
		);
	}

	// If no server selected or server not found, redirect to dashboard
	if (!serverId || !selectedServer) {
		return (
			<main className="flex items-center justify-center p-4 md:p-8">
				<div className="w-full max-w-2xl">
					<Card>
						<CardHeader className="text-center">
							<CardTitle className="text-2xl">Server not found</CardTitle>
							<CardDescription>
								The server you're trying to set up could not be found.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col items-center gap-4">
							<Button asChild>
								<Link href="/dashboard">Go to Dashboard</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</main>
		);
	}

	// Step 2: Installation
	if (step === "install" && selectedServer) {
		const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
		const inviteUrl = discordClientId
			? `https://discord.com/oauth2/authorize?client_id=${discordClientId}&permissions=328565083201&scope=bot+applications.commands&guild_id=${selectedServer.discordId}&disable_guild_select=true`
			: "#";

		return (
			<main className="flex items-center justify-center p-4 md:p-8">
				<div className="w-full max-w-2xl">
					<BotPermissionsDisplay
						server={{
							discordId: selectedServer.discordId,
							name: selectedServer.name,
							icon: selectedServer.icon,
						}}
						onCancel={() => router.push("/dashboard")}
						onAdd={() => handleInstallClick(selectedServer.discordId)}
					/>
				</div>
			</main>
		);
	}

	// Step 3: Completion
	if (step === "complete" && selectedServer) {
		const serverWithBot = servers?.find(
			(s) => s.discordId === serverId && s.hasBot && s.aoServerId,
		);

		return (
			<main className="flex items-center justify-center p-4 md:p-8">
				<div className="w-full max-w-2xl space-y-6">
					<Card>
						<CardHeader className="text-center">
							<div className="flex justify-center mb-4">
								<CheckCircle2 className="h-16 w-16 text-green-500" />
							</div>
							<CardTitle className="text-2xl">Installation Complete!</CardTitle>
							<CardDescription>
								Answer Overflow has been successfully added to{" "}
								{selectedServer.name}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-4">
								<p className="text-muted-foreground">
									Great! Answer Overflow is now installed on your server. Here's
									what you can do next:
								</p>

								<ul className="list-disc list-inside space-y-2 text-muted-foreground">
									<li>Configure which channels to index</li>
									<li>Set up custom domain (if applicable)</li>
									<li>View analytics and insights</li>
									<li>Manage server settings</li>
								</ul>
							</div>

							<div className="flex flex-col gap-3">
								{serverWithBot?.aoServerId ? (
									<Button asChild size="lg">
										<Link href={`/dashboard/${serverWithBot.aoServerId}`}>
											Go to Dashboard
										</Link>
									</Button>
								) : (
									<Button asChild size="lg">
										<Link href="/dashboard">Go to Dashboard</Link>
									</Button>
								)}

								<Button variant="outline" asChild>
									<Link href="/dashboard">Add to another server</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</main>
		);
	}

	return null;
}
