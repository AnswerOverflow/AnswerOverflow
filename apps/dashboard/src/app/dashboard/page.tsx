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
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { ServerCard } from "../../components/server-card";
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
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Your Servers</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers.map((server) => (
          <ServerCard
            key={server.discordId}
            server={{
              discordId: server.discordId,
              name: server.name,
              icon: server.icon,
              highestRole: server.highestRole,
              hasBot: server.hasBot,
              aoServerId: server.aoServerId,
            }}
          />
        ))}
      </div>
    </main>
  );
}
