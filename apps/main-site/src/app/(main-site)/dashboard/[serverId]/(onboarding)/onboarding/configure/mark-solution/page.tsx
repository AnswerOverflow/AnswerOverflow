"use client";

import { FeaturePreviewPlaceholder } from "../components/mock-message-preview";
import { StepLayout } from "../components/step-layout";
import { ToggleChannelSections } from "../components/toggle-channel-sections";
import { WizardCard } from "../components/wizard-card";
import { WizardNav } from "../components/wizard-nav";
import { useWizard } from "../components/wizard-context";

export default function MarkSolutionPage() {
	const {
		serverId,
		channels,
		channelSettings,
		toggleChannelSetting,
		setAllChannelSetting,
	} = useWizard();

	const enabledChannels = channels.filter((c) =>
		channelSettings.markSolutionEnabled.has(c.id.toString()),
	);
	const availableChannels = channels.filter(
		(c) => !channelSettings.markSolutionEnabled.has(c.id.toString()),
	);

	return (
		<StepLayout
			title="Mark Solution"
			description="In these channels, users can mark a message as the answer to their question. This highlights the solution and helps others find answers faster."
		>
			<WizardCard>
				<div className="space-y-6">
					<FeaturePreviewPlaceholder feature="mark-solution" />
					<div className="border-t pt-6">
						<ToggleChannelSections
							enabledTitle="Mark solution enabled"
							availableTitle="Available channels"
							enabledChannels={enabledChannels}
							availableChannels={availableChannels}
							selectedIds={channelSettings.markSolutionEnabled}
							onToggle={(channelId) =>
								toggleChannelSetting("markSolutionEnabled", channelId)
							}
							onSelectAll={(channelIds, enabled) =>
								setAllChannelSetting("markSolutionEnabled", channelIds, enabled)
							}
						/>
					</div>
				</div>
			</WizardCard>

			<WizardNav
				backHref={`/dashboard/${serverId}/onboarding/configure/auto-thread`}
				nextHref={`/dashboard/${serverId}/onboarding/configure/solution-instructions`}
				showSkip
			/>
		</StepLayout>
	);
}
