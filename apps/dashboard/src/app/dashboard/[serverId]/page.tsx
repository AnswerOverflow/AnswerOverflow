"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Label } from "@packages/ui/components/label";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { Switch } from "@packages/ui/components/switch";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SettingsNav } from "./components/settings-nav";

function ToggleServerFlag({
	title,
	description,
	flagKey: _flagKey,
	checked,
	onChange,
	disabled,
}: {
	title: string;
	description: string;
	flagKey:
		| "readTheRulesConsentEnabled"
		| "considerAllMessagesPublicEnabled"
		| "anonymizeMessagesEnabled";
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-2">
					<Switch
						checked={checked}
						onCheckedChange={onChange}
						disabled={disabled}
					/>
					<Label>Enabled</Label>
				</div>
			</CardContent>
		</Card>
	);
}

export default function ServerSettingsPage() {
	const params = useParams();
	const serverId = params.serverId as Id<"servers">;

	const dashboardData = useQuery(api.dashboard_queries.getDashboardData, {
		serverId,
	});

	const updateServerPreferences = useMutation(
		api.dashboard_mutations.updateServerPreferencesFlags,
	).withOptimisticUpdate((localStore, args) => {
		const currentData = localStore.getQuery(
			api.dashboard_queries.getDashboardData,
			{ serverId: args.serverId },
		);
		if (currentData !== undefined) {
			localStore.setQuery(
				api.dashboard_queries.getDashboardData,
				{ serverId: args.serverId },
				{
					...currentData,
					server: {
						...currentData.server,
						preferences: {
							...currentData.server.preferences,
							...args.flags,
						},
					},
				},
			);
		}
	});

	if (!dashboardData) {
		return (
			<main className="max-w-7xl mx-auto p-6 lg:p-8">
				<div className="text-muted-foreground">Loading server settings...</div>
			</main>
		);
	}

	const { server } = dashboardData;
	const preferences = server.preferences;

	const handleServerToggle = async (
		flagKey:
			| "readTheRulesConsentEnabled"
			| "considerAllMessagesPublicEnabled"
			| "anonymizeMessagesEnabled",
		checked: boolean,
	) => {
		try {
			await updateServerPreferences({
				serverId,
				flags: {
					[flagKey]: checked,
				},
			});
		} catch (error) {
			console.error("Failed to update server preferences:", error);
		}
	};

	return (
		<main className="max-w-7xl mx-auto p-6 lg:p-8">
			<div className="mb-8">
				<Button variant="ghost" asChild>
					<Link href="/dashboard">← Back to Servers</Link>
				</Button>
			</div>

			<div className="mb-8 flex items-center gap-4">
				<ServerIcon
					server={{
						discordId: server.discordId,
						name: server.name,
						icon: server.icon ?? undefined,
					}}
					size={64}
				/>
				<div>
					<h1 className="text-3xl font-bold">{server.name}</h1>
				</div>
			</div>

			<div className="mb-8">
				<SettingsNav />
			</div>

			<div className="space-y-6">
				<ToggleServerFlag
					title="Consider All Messages Public"
					description="All messages in the server will be considered public and displayed on the web."
					flagKey="considerAllMessagesPublicEnabled"
					checked={preferences.considerAllMessagesPublicEnabled ?? false}
					onChange={(checked) =>
						handleServerToggle("considerAllMessagesPublicEnabled", checked)
					}
				/>

				<ToggleServerFlag
					title="Anonymize Messages"
					description="Replace Discord usernames with pseudonyms. Names will randomize on page refresh."
					flagKey="anonymizeMessagesEnabled"
					checked={preferences.anonymizeMessagesEnabled ?? false}
					onChange={(checked) =>
						handleServerToggle("anonymizeMessagesEnabled", checked)
					}
				/>

				<ToggleServerFlag
					title="Read the Rules Consent"
					description="Add a consent prompt to the server rules to mark new users as consenting to publicly display their messages."
					flagKey="readTheRulesConsentEnabled"
					checked={preferences.readTheRulesConsentEnabled ?? false}
					onChange={(checked) =>
						handleServerToggle("readTheRulesConsentEnabled", checked)
					}
				/>
			</div>
		</main>
	);
}
