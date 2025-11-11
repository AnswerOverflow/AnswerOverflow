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
import { ServerIcon } from "@packages/ui/components/server-icon";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import Link from "next/link";
import { authClient } from "../../lib/auth-client";

export default function DashboardHome() {
	const { data: session, isPending } = authClient.useSession();
	const getUserServers = useAction(api.dashboard.getUserServers);

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
	});

	if (isPending || isLoading) {
		return (
			<main className="max-w-6xl mx-auto p-8">
				<h1 className="text-3xl font-bold mb-6">Your Servers</h1>
				<div className="text-muted-foreground">Loading servers...</div>
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
				</Card>
			</main>
		);
	}

	return (
		<main className="max-w-6xl mx-auto p-8">
			<h1 className="text-3xl font-bold mb-6">Your Servers</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{servers.map((server) => (
					<Card
						key={server.discordId}
						className="hover:shadow-lg transition-shadow"
					>
						<CardHeader>
							<div className="flex items-center gap-4">
								<ServerIcon
									server={{
										discordId: server.discordId,
										name: server.name,
										icon: server.icon ?? undefined,
									}}
									size={48}
								/>
								<div className="flex-1 min-w-0">
									<CardTitle className="truncate">{server.name}</CardTitle>
									<CardDescription>
										{server.highestRole} •{" "}
										{server.hasBot ? "Bot installed" : "No bot"}
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{server.aoServerId ? (
								<div className="flex gap-2">
									<Button asChild className="flex-1">
										<Link href={`/dashboard/${server.aoServerId}`}>
											Manage Server
										</Link>
									</Button>
									<Button asChild variant="outline">
										<Link href={`/c/${server.aoServerId}`} target="_blank">
											View
										</Link>
									</Button>
								</div>
							) : (
								<div className="text-sm text-muted-foreground">
									Server not indexed yet. Add the bot to your server to get
									started.
								</div>
							)}
						</CardContent>
					</Card>
				))}
			</div>
		</main>
	);
}
