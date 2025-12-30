"use client";

import { api } from "@packages/database/convex/_generated/api";
import { BotPermissionsDisplay } from "@packages/ui/components/bot-permissions";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { useSession } from "@packages/ui/components/convex-client-provider";
import { Link } from "@packages/ui/components/link";
import { Skeleton } from "@packages/ui/components/skeleton";
import * as Sentry from "@sentry/nextjs";
import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import { useAction, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthClient } from "../../../../../../lib/auth-client";

type OnboardingStep = "auth" | "install";

export default function OnboardingPage() {
	const router = useRouter();
	const params = useParams();
	const serverId = params.serverId as string;
	const authClient = useAuthClient();
	const { data: session, isPending: isSessionPending } = useSession({
		allowAnonymous: false,
	});
	const getUserServers = useAction(api.authenticated.dashboard.getUserServers);
	const trackBotAddClick = useAction(
		api.authenticated.dashboard.trackBotAddClick,
	);
	const [step, setStep] = useState<OnboardingStep>("auth");
	const [isWaitingForBot, setIsWaitingForBot] = useState(false);

	const { data: servers, isLoading: isServersLoading } = useTanstackQuery({
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

	const serverFromDb = useQuery(
		api.authenticated.dashboard_queries.getUserServersForDropdown,
		isWaitingForBot && session?.user ? {} : "skip",
	);
	const serverWithBot = serverFromDb?.find(
		(s) => s.discordId.toString() === serverId && s.hasBot && s.aoServerId,
	);

	useEffect(() => {
		if (isSessionPending) {
			setStep("auth");
			return;
		}

		if (!session?.user) {
			setStep("auth");
			return;
		}

		if (!serverId) {
			router.push("/dashboard");
			return;
		}

		if (selectedServer?.hasBot && selectedServer.aoServerId) {
			router.push(`/dashboard/${serverId}/onboarding/configure`);
			return;
		}

		if (step === "auth" && serverId) {
			setStep("install");
		}
	}, [session, isSessionPending, serverId, step, router, selectedServer]);

	useEffect(() => {
		if (isWaitingForBot && serverWithBot) {
			router.push(`/dashboard/${serverId}/onboarding/configure`);
		}
	}, [isWaitingForBot, serverWithBot, serverId, router]);

	const handleInstallClick = async (discordId: string) => {
		const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
		if (!discordClientId) {
			return;
		}

		try {
			await trackBotAddClick({ serverId: BigInt(discordId) });
		} catch (error) {
			Sentry.captureException(error);
		}

		const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${discordClientId}&permissions=328565083201&scope=bot+applications.commands&guild_id=${discordId}&disable_guild_select=true`;
		window.open(inviteUrl, "_blank", "noopener,noreferrer");
		setIsWaitingForBot(true);
	};

	if (isSessionPending || isServersLoading) {
		return (
			<main className="flex flex-col p-6 md:p-8 pt-12 md:pt-16 min-h-[calc(100vh-4rem)]">
				<div className="w-full max-w-2xl mx-auto space-y-6">
					<Skeleton className="h-12 w-64" />
					<Skeleton className="h-96 w-full" />
				</div>
			</main>
		);
	}

	if (step === "auth" || !session?.user) {
		return (
			<main className="flex flex-col p-6 md:p-8 pt-12 md:pt-16 min-h-[calc(100vh-4rem)]">
				<div className="w-full max-w-2xl mx-auto">
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
									const callbackUrl = `/dashboard/${serverId}/onboarding`;
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

	if (!serverId || !selectedServer) {
		return (
			<main className="flex flex-col p-6 md:p-8 pt-12 md:pt-16 min-h-[calc(100vh-4rem)]">
				<div className="w-full max-w-2xl mx-auto">
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

	if (step === "install" && selectedServer) {
		if (isWaitingForBot) {
			return (
				<main className="flex flex-col p-6 md:p-8 pt-12 md:pt-16 min-h-[calc(100vh-4rem)]">
					<div className="w-full max-w-2xl mx-auto">
						<Card>
							<CardHeader className="text-center">
								<CardTitle className="text-2xl">
									Waiting for Bot Installation
								</CardTitle>
								<CardDescription>
									Complete the bot installation in the popup window. This page
									will automatically continue once the bot is added to{" "}
									{selectedServer.name}.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col items-center gap-6">
								<div className="flex items-center gap-2">
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
									<span className="text-muted-foreground">
										Waiting for bot to be added...
									</span>
								</div>
								<Button
									variant="outline"
									onClick={() =>
										handleInstallClick(selectedServer.discordId.toString())
									}
								>
									Open Installation Window Again
								</Button>
							</CardContent>
						</Card>
					</div>
				</main>
			);
		}

		return (
			<main className="flex flex-col p-6 md:p-8 pt-12 md:pt-16 min-h-[calc(100vh-4rem)]">
				<div className="w-full max-w-2xl mx-auto">
					<BotPermissionsDisplay
						server={{
							discordId: BigInt(selectedServer.discordId),
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

	return null;
}
