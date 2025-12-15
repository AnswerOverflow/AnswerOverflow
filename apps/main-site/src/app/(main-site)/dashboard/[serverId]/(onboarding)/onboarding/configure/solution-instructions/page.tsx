"use client";

import { FeaturePreviewPlaceholder } from "../components/mock-message-preview";
import { StepLayout } from "../components/step-layout";
import { ToggleChannelSections } from "../components/toggle-channel-sections";
import { WizardCard } from "../components/wizard-card";
import { WizardNav } from "../components/wizard-nav";
import { useWizard } from "../components/wizard-context";

export default function SolutionInstructionsPage() {
	const {
		serverId,
		channels,
		channelSettings,
		toggleChannelSetting,
		setAllChannelSetting,
		getAllForumChannels,
	} = useWizard();

	const enabledChannels = channels.filter((c) =>
		channelSettings.solutionInstructionsEnabled.has(c.id.toString()),
	);
	const availableChannels = channels.filter(
		(c) => !channelSettings.solutionInstructionsEnabled.has(c.id.toString()),
	);

	const forumChannels = getAllForumChannels();
	const hasForumChannels = forumChannels.length > 0;

	const nextHref = hasForumChannels
		? `/dashboard/${serverId}/onboarding/configure/solved-tags`
		: `/dashboard/${serverId}/onboarding/configure/complete`;

	return (
		<StepLayout
			title="Solution Instructions"
			description="When a new thread is created in these channels, the bot will post a message explaining how to mark a solution. This helps users learn the feature."
		>
			<WizardCard>
				<div className="space-y-6">
					<FeaturePreviewPlaceholder feature="solution-instructions" />
					<div className="border-t pt-6">
						<ToggleChannelSections
							enabledTitle="Instructions enabled"
							availableTitle="Available channels"
							enabledChannels={enabledChannels}
							availableChannels={availableChannels}
							selectedIds={channelSettings.solutionInstructionsEnabled}
							onToggle={(channelId) =>
								toggleChannelSetting("solutionInstructionsEnabled", channelId)
							}
							onSelectAll={(channelIds, enabled) =>
								setAllChannelSetting(
									"solutionInstructionsEnabled",
									channelIds,
									enabled,
								)
							}
						/>
					</div>
				</div>
			</WizardCard>

			<WizardNav
				backHref={`/dashboard/${serverId}/onboarding/configure/mark-solution`}
				nextHref={nextHref}
				showSkip
			/>
		</StepLayout>
	);
}
