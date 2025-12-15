"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Button } from "@packages/ui/components/button";
import { useMutation } from "convex/react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepLayout } from "../components/step-layout";
import { WizardCard } from "../components/wizard-card";
import { useWizard } from "../components/wizard-context";

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
					forumGuidelinesConsentEnabled: false,
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
							Summary:
						</p>
						<ul className="text-sm space-y-1 text-muted-foreground">
							<li>
								• Auto-thread enabled on{" "}
								{channelSettings.autoThreadEnabled.size} channel
								{channelSettings.autoThreadEnabled.size !== 1 ? "s" : ""}
							</li>
							<li>
								• Mark solution enabled on{" "}
								{channelSettings.markSolutionEnabled.size} channel
								{channelSettings.markSolutionEnabled.size !== 1 ? "s" : ""}
							</li>
							<li>
								• Solution instructions on{" "}
								{channelSettings.solutionInstructionsEnabled.size} channel
								{channelSettings.solutionInstructionsEnabled.size !== 1
									? "s"
									: ""}
							</li>
							<li>
								• Solved tags configured for {channelSettings.solvedTags.size}{" "}
								forum
								{channelSettings.solvedTags.size !== 1 ? "s" : ""}
							</li>
						</ul>
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
