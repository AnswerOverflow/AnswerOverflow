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
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@packages/ui/components/tabs";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import React, { use } from "react";

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

function ToggleChannelFlag({
	title,
	description,
	flagKey: _flagKey,
	checked,
	onChange,
	disabled,
	disabledReason,
}: {
	title: string;
	description: string;
	flagKey:
		| "indexingEnabled"
		| "markSolutionEnabled"
		| "sendMarkSolutionInstructionsInNewThreads"
		| "autoThreadEnabled"
		| "forumGuidelinesConsentEnabled";
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	disabledReason?: string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>
					{description}
					{disabled && disabledReason && (
						<span className="block mt-2 text-destructive">
							{disabledReason}
						</span>
					)}
				</CardDescription>
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

export default function ServerSettingsPage({
	params,
}: {
	params: Promise<{ serverId: string }>;
}) {
	const resolvedParams = use(params);
	const serverId = resolvedParams.serverId as Id<"servers">;
	const [selectedChannelId, setSelectedChannelId] = React.useState<
		string | null
	>(null);

	const dashboardData = useQuery(api.dashboard_queries.getDashboardData, {
		serverId,
	});

	const updateServerPreferences = useMutation(
		api.dashboard_mutations.updateServerPreferencesFlags,
	);
	const updateChannelSettings = useMutation(
		api.dashboard_mutations.updateChannelSettingsFlags,
	);

	if (!dashboardData) {
		return (
			<main className="max-w-4xl mx-auto p-8">
				<div className="text-muted-foreground">Loading server settings...</div>
			</main>
		);
	}

	const { server, channels } = dashboardData;
	const preferences = server.preferences;
	const selectedChannel = selectedChannelId
		? channels.find((c) => c.id === selectedChannelId)
		: (channels[0] ?? null);

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

	const handleChannelToggle = async (
		flagKey:
			| "indexingEnabled"
			| "markSolutionEnabled"
			| "sendMarkSolutionInstructionsInNewThreads"
			| "autoThreadEnabled"
			| "forumGuidelinesConsentEnabled",
		checked: boolean,
	) => {
		if (!selectedChannel) return;
		try {
			await updateChannelSettings({
				channelId: selectedChannel.id,
				flags: {
					[flagKey]: checked,
				},
			});
		} catch (error) {
			console.error("Failed to update channel settings:", error);
		}
	};

	return (
		<main className="max-w-4xl mx-auto p-8">
			<div className="mb-6">
				<Button variant="ghost" asChild>
					<Link href="/dashboard">← Back to Servers</Link>
				</Button>
			</div>

			<div className="mb-6 flex items-center gap-4">
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
					<p className="text-muted-foreground">Server Management</p>
				</div>
			</div>

			<Tabs defaultValue="settings" className="w-full">
				<TabsList>
					<TabsTrigger value="settings">Server Settings</TabsTrigger>
					<TabsTrigger value="channels">Channels</TabsTrigger>
				</TabsList>

				<TabsContent value="settings" className="space-y-4 mt-6">
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
				</TabsContent>

				<TabsContent value="channels" className="space-y-4 mt-6">
					{channels.length === 0 ? (
						<Card>
							<CardHeader>
								<CardTitle>No channels found</CardTitle>
								<CardDescription>
									No channels are available for this server yet.
								</CardDescription>
							</CardHeader>
						</Card>
					) : (
						<>
							<Card>
								<CardHeader>
									<CardTitle>Select Channel</CardTitle>
									<CardDescription>
										Choose a channel to configure its settings
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
										{channels.map((channel) => {
											const channelTypeName =
												channel.type === 15
													? "Forum"
													: channel.type === 5
														? "Announcement"
														: "Text";
											return (
												<Button
													key={channel.id}
													variant={
														selectedChannelId === channel.id
															? "default"
															: "outline"
													}
													onClick={() => setSelectedChannelId(channel.id)}
												>
													#{channel.name} ({channelTypeName})
												</Button>
											);
										})}
									</div>
								</CardContent>
							</Card>

							{selectedChannel && (
								<div className="space-y-4">
									<h2 className="text-xl font-semibold">
										Channel: #{selectedChannel.name}
									</h2>

									<ToggleChannelFlag
										title="Indexing Enabled"
										description="Enable indexing of a channel. Indexing can take up to 24 hours to collect initial data depending on the channel volume."
										flagKey="indexingEnabled"
										checked={selectedChannel.flags.indexingEnabled}
										onChange={(checked) =>
											handleChannelToggle("indexingEnabled", checked)
										}
									/>

									<ToggleChannelFlag
										title="Forum Guidelines Consent Enabled"
										description="Marks all posts as public, and disables Username Anonymization for the selected channel. If enabled, add a public message disclaimer to your forum guidelines."
										flagKey="forumGuidelinesConsentEnabled"
										checked={
											selectedChannel.flags.forumGuidelinesConsentEnabled
										}
										onChange={(checked) =>
											handleChannelToggle(
												"forumGuidelinesConsentEnabled",
												checked,
											)
										}
										disabled={selectedChannel.type !== 15}
										disabledReason="This option is only available for forum channels."
									/>

									<ToggleChannelFlag
										title="Mark Solution Enabled"
										description="Highlights the marked solution under the user's question."
										flagKey="markSolutionEnabled"
										checked={selectedChannel.flags.markSolutionEnabled}
										onChange={(checked) =>
											handleChannelToggle("markSolutionEnabled", checked)
										}
									/>

									<ToggleChannelFlag
										title="Send Mark Solution Instructions in New Threads"
										description="Enables the bot to provide instructions to users on how to mark a solution in new threads."
										flagKey="sendMarkSolutionInstructionsInNewThreads"
										checked={
											selectedChannel.flags
												.sendMarkSolutionInstructionsInNewThreads
										}
										onChange={(checked) =>
											handleChannelToggle(
												"sendMarkSolutionInstructionsInNewThreads",
												checked,
											)
										}
										disabled={!selectedChannel.flags.markSolutionEnabled}
										disabledReason="This option is only available if mark solution is enabled."
									/>

									<ToggleChannelFlag
										title="Auto Thread Enabled"
										description="Automatically create threads for messages in this channel."
										flagKey="autoThreadEnabled"
										checked={selectedChannel.flags.autoThreadEnabled}
										onChange={(checked) =>
											handleChannelToggle("autoThreadEnabled", checked)
										}
									/>
								</div>
							)}
						</>
					)}
				</TabsContent>
			</Tabs>
		</main>
	);
}
