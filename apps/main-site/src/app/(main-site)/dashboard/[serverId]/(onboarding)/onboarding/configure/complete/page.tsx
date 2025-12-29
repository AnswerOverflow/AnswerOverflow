"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Button } from "@packages/ui/components/button";
import { useMutation } from "convex/react";
import { CheckCircle2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepLayout } from "../components/step-layout";
import { WizardCard } from "../components/wizard-card";
import {
	type ChannelRecommendation,
	useWizard,
} from "../components/wizard-context";

const CHANNEL_TYPE_FORUM = 15;

function getChannelChanges(
	channel: ChannelRecommendation,
	channelSettings: {
		autoThreadEnabled: Set<string>;
		markSolutionEnabled: Set<string>;
		solutionInstructionsEnabled: Set<string>;
		solvedTags: Map<string, string>;
	},
): Array<string> {
	const channelId = channel.id.toString();
	const changes: Array<string> = [];

	changes.push("Indexing enabled");

	if (channelSettings.autoThreadEnabled.has(channelId)) {
		changes.push("Auto-thread enabled");
	}

	if (channelSettings.markSolutionEnabled.has(channelId)) {
		changes.push("Mark solution enabled");
	}

	if (channelSettings.solutionInstructionsEnabled.has(channelId)) {
		changes.push("Solution instructions enabled");
	}

	const solvedTagId = channelSettings.solvedTags.get(channelId);
	if (solvedTagId && channel.type === CHANNEL_TYPE_FORUM) {
		const tag = channel.availableTags?.find(
			(t) => t.id.toString() === solvedTagId,
		);
		if (tag) {
			changes.push(`Solved tag: ${tag.name}`);
		}
	}

	return changes;
}

export default function CompletePage() {
	const router = useRouter();
	const {
		serverId,
		serverSettings,
		channelSettings,
		getIndexedChannels,
		getAllForumChannels,
	} = useWizard();

	const [isApplying, setIsApplying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

	const applyConfiguration = useMutation(
		api.authenticated.onboarding.applyRecommendedConfiguration,
	);

	const indexedChannels = getIndexedChannels();
	const forumChannels = getAllForumChannels();
	const backHref =
		forumChannels.length > 0
			? `/dashboard/${serverId}/onboarding/configure/solved-tags`
			: `/dashboard/${serverId}/onboarding/configure/solution-instructions`;

	const handleApply = async () => {
		setIsApplying(true);
		setError(null);

		try {
			const channelConfigurations = indexedChannels.map((channel) => {
				const channelId = channel.id.toString();
				const tagIdStr = channelSettings.solvedTags.get(channelId);
				return {
					channelId: channel.id,
					indexingEnabled: true,
					autoThreadEnabled: channelSettings.autoThreadEnabled.has(channelId),
					markSolutionEnabled:
						channelSettings.markSolutionEnabled.has(channelId),
					sendMarkSolutionInstructionsInNewThreads:
						channelSettings.solutionInstructionsEnabled.has(channelId),
					solutionTagId: tagIdStr ? BigInt(tagIdStr) : undefined,
				};
			});

			await applyConfiguration({
				serverId: BigInt(serverId),
				channelConfigurations,
				serverSettings: {
					considerAllMessagesPublicEnabled: serverSettings.publicMessages,
					anonymizeMessagesEnabled: serverSettings.anonymizeUsernames,
				},
			});

			router.push(`/dashboard/${serverId}`);
		} catch (err) {
			console.error("Failed to apply configuration:", err);
			setError("Failed to save configuration. Please try again.");
			setIsApplying(false);
		}
	};

	return (
		<StepLayout
			title="Ready to Go!"
			description="Review your configuration and apply it to start indexing your server."
		>
			<WizardCard>
				<div className="space-y-4">
					<div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
						<CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
						<div>
							<p className="font-medium">
								{indexedChannels.length} channel
								{indexedChannels.length !== 1 ? "s" : ""} will be indexed
							</p>
							<p className="text-sm text-muted-foreground mt-1">
								{serverSettings.publicMessages
									? "Messages will be publicly searchable"
									: "Messages will be private"}
								{serverSettings.anonymizeUsernames &&
									" • Usernames will be anonymized"}
							</p>
						</div>
					</div>

					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground">
							Changes per channel:
						</p>
						<div className="space-y-1 max-h-64 overflow-y-auto">
							{indexedChannels.map((channel) => {
								const channelId = channel.id.toString();
								const isExpanded = expandedChannel === channelId;
								const changes = getChannelChanges(channel, channelSettings);
								const isForum = channel.type === CHANNEL_TYPE_FORUM;

								return (
									<div
										key={channelId}
										className="border rounded-md overflow-hidden"
									>
										<button
											type="button"
											onClick={() =>
												setExpandedChannel(isExpanded ? null : channelId)
											}
											className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors text-left"
										>
											{isExpanded ? (
												<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
											) : (
												<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
											)}
											<span className="text-sm font-medium truncate">
												{isForum ? "" : "#"}
												{channel.name}
											</span>
											<span className="text-xs text-muted-foreground ml-auto shrink-0">
												{changes.length} change
												{changes.length !== 1 ? "s" : ""}
											</span>
										</button>
										{isExpanded && (
											<div className="px-8 pb-2 space-y-1">
												{changes.map((change) => (
													<p
														key={change}
														className="text-sm text-muted-foreground"
													>
														• {change}
													</p>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{error && (
						<div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
							{error}
						</div>
					)}
				</div>
			</WizardCard>

			<div className="flex items-center justify-between pt-3 sm:pt-4 mt-auto">
				<Button
					variant="ghost"
					onClick={() => router.push(backHref)}
					disabled={isApplying}
				>
					Back
				</Button>
				<Button onClick={handleApply} disabled={isApplying}>
					{isApplying ? (
						<>
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							Applying...
						</>
					) : (
						"Apply Configuration"
					)}
				</Button>
			</div>
		</StepLayout>
	);
}
