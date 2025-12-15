"use client";

import { FeaturePreviewPlaceholder } from "../components/mock-message-preview";
import { StepLayout } from "../components/step-layout";
import { ToggleChannelSections } from "../components/toggle-channel-sections";
import { WizardCard } from "../components/wizard-card";
import { WizardNav } from "../components/wizard-nav";
import { useWizard } from "../components/wizard-context";

export default function IndexingPage() {
	const {
		serverId,
		channels,
		channelSettings,
		toggleChannelSetting,
		setAllChannelSetting,
	} = useWizard();

	const recommendedChannels = channels.filter((c) => c.shouldIndex);
	const otherChannels = channels.filter((c) => !c.shouldIndex);

	return (
		<StepLayout
			title="Enable Indexing"
			description="Select which channels should be searchable on the web. We've pre-selected channels that look like good candidates."
		>
			<WizardCard>
				<div className="space-y-6">
					<FeaturePreviewPlaceholder feature="indexing" />
					<div className="border-t pt-6">
						<ToggleChannelSections
							enabledTitle="Recommended channels"
							availableTitle="Other channels"
							enabledChannels={recommendedChannels}
							availableChannels={otherChannels}
							selectedIds={channelSettings.indexingEnabled}
							onToggle={(channelId) =>
								toggleChannelSetting("indexingEnabled", channelId)
							}
							onSelectAll={(channelIds, enabled) =>
								setAllChannelSetting("indexingEnabled", channelIds, enabled)
							}
						/>
					</div>
				</div>
			</WizardCard>

			<WizardNav
				backHref={`/dashboard/${serverId}/onboarding/configure`}
				nextHref={`/dashboard/${serverId}/onboarding/configure/auto-thread`}
				isNextDisabled={channelSettings.indexingEnabled.size === 0}
			/>
		</StepLayout>
	);
}
