"use client";

import { api } from "@packages/database/convex/_generated/api";
import { BlueLink } from "@packages/ui/components/blue-link";
import { BotCustomization } from "@packages/ui/components/bot-customization";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { CustomDomain } from "@packages/ui/components/custom-domain";
import { Label } from "@packages/ui/components/label";
import { Switch } from "@packages/ui/components/switch";
import { useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { useAuthenticatedQuery } from "../../../../../../lib/use-authenticated-query";
import { TierAccessOnly } from "../components/tier-access-only";
import { CurrentPlanCard } from "./components";

function ToggleServerFlag({
	title,
	description,
	checked,
	onChange,
	disabled,
}: {
	title: React.ReactNode;
	description: React.ReactNode;
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

export default function SettingsPage() {
	const params = useParams();
	const serverId = params.serverId as string;

	const dashboardData = useAuthenticatedQuery(
		api.authenticated.dashboard_queries.getDashboardData,
		{
			serverId: BigInt(serverId),
		},
	);

	const updateServerPreferences = useMutation(
		api.authenticated.dashboard_mutations.updateServerPreferencesFlags,
	).withOptimisticUpdate((localStore, args) => {
		const currentData = localStore.getQuery(
			api.authenticated.dashboard_queries.getDashboardData,
			{ serverId: args.serverId },
		);
		if (currentData !== undefined) {
			localStore.setQuery(
				api.authenticated.dashboard_queries.getDashboardData,
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
		return null;
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
				serverId: BigInt(serverId),
				flags: {
					[flagKey]: checked,
				},
			});
		} catch (error) {
			console.error("Failed to update server preferences:", error);
		}
	};

	return (
		<div className="flex max-w-[800px] w-full mx-auto flex-col gap-4">
			<CurrentPlanCard serverId={serverId} />
			<ToggleServerFlag
				title="Consider All Messages In Indexed Channels Public"
				description={
					<>
						All messages in indexed channels will be considered public and
						displayed on the web. Learn more about{" "}
						<BlueLink
							href="/docs/user-settings/displaying-messages"
							target="_blank"
						>
							displaying messages
						</BlueLink>
						.
					</>
				}
				flagKey="considerAllMessagesPublicEnabled"
				checked={preferences.considerAllMessagesPublicEnabled ?? false}
				onChange={(checked) =>
					handleServerToggle("considerAllMessagesPublicEnabled", checked)
				}
			/>
			<ToggleServerFlag
				title="Anonymize Messages"
				description={
					<>
						Replace Discord usernames with pseudonyms. Names will randomize on
						page refresh. Can be disabled per-channel with "Forum Guidelines
						Consent Enabled" option.
					</>
				}
				flagKey="anonymizeMessagesEnabled"
				checked={preferences.anonymizeMessagesEnabled ?? false}
				onChange={(checked) =>
					handleServerToggle("anonymizeMessagesEnabled", checked)
				}
			/>
			<ToggleServerFlag
				title="Read the Rules Consent"
				description={
					<>
						Add a consent prompt to the server rules to mark new users as
						consenting to publicly display their messages.
					</>
				}
				flagKey="readTheRulesConsentEnabled"
				checked={preferences.readTheRulesConsentEnabled ?? false}
				onChange={(checked) =>
					handleServerToggle("readTheRulesConsentEnabled", checked)
				}
			/>
			<TierAccessOnly
				enabledFor={["PRO", "ENTERPRISE", "ADVANCED", "STARTER", "OPEN_SOURCE"]}
				serverId={serverId}
			>
				{(enabled) => (
					<CustomDomain
						className={enabled ? "" : "rounded-b-none border-b-0"}
						defaultDomain={server.customDomain ?? undefined}
						serverId={BigInt(serverId)}
					/>
				)}
			</TierAccessOnly>
			<TierAccessOnly
				enabledFor={["PRO", "ENTERPRISE", "ADVANCED", "OPEN_SOURCE"]}
				serverId={serverId}
			>
				{(enabled) => (
					<BotCustomization
						className={enabled ? "" : "rounded-b-none border-b-0"}
						serverId={BigInt(serverId)}
						data={server.botCustomization}
					/>
				)}
			</TierAccessOnly>
		</div>
	);
}
