"use client";

import { FeaturePreviewPlaceholder } from "../components/mock-message-preview";
import { StepLayout } from "../components/step-layout";
import { ToggleChannelSections } from "../components/toggle-channel-sections";
import { WizardCard } from "../components/wizard-card";
import { WizardNav } from "../components/wizard-nav";
import { useWizard } from "../components/wizard-context";

export default function AutoThreadPage() {
	const {
		serverId,
		channelSettings,
		toggleChannelSetting,
		setAllChannelSetting,
		getAllNonForumChannels,
	} = useWizard();

	const allNonForumChannels = getAllNonForumChannels();

	const enabledChannels = allNonForumChannels.filter((c) =>
		channelSettings.autoThreadEnabled.has(c.id.toString()),
	);
	const availableChannels = allNonForumChannels.filter(
		(c) => !channelSettings.autoThreadEnabled.has(c.id.toString()),
	);

	const hasChannels = allNonForumChannels.length > 0;

	return (
		<StepLayout
			title="Auto-Thread"
			description="When someone posts a message in these channels, the bot will automatically create a thread for the conversation. This keeps discussions organized."
		>
			<WizardCard>
				{hasChannels ? (
					<div className="space-y-6">
						<FeaturePreviewPlaceholder feature="auto-thread" />
						<div className="border-t pt-6">
							<ToggleChannelSections
								enabledTitle="Auto-thread enabled"
								availableTitle="Available channels"
								enabledChannels={enabledChannels}
								availableChannels={availableChannels}
								selectedIds={channelSettings.autoThreadEnabled}
								onToggle={(channelId) =>
									toggleChannelSetting("autoThreadEnabled", channelId)
								}
								onSelectAll={(channelIds, enabled) =>
									setAllChannelSetting("autoThreadEnabled", channelIds, enabled)
								}
							/>
						</div>
					</div>
				) : (
					<div className="text-center py-8 text-muted-foreground">
						<p>No text or announcement channels in your server.</p>
						<p className="text-sm mt-2">
							Auto-thread is only available for non-forum channels.
						</p>
					</div>
				)}
			</WizardCard>

			<WizardNav
				backHref={`/dashboard/${serverId}/onboarding/configure/indexing`}
				nextHref={`/dashboard/${serverId}/onboarding/configure/mark-solution`}
				showSkip={hasChannels}
			/>
		</StepLayout>
	);
}
