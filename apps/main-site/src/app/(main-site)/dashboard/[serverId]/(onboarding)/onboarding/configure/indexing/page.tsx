"use client";

import { Card, CardContent } from "@packages/ui/components/card";
import { ChannelList } from "../components/channel-list";
import { StepLayout } from "../components/step-layout";
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

	return (
		<StepLayout
			title="Enable Indexing"
			description="Select which channels should be searchable on the web. We've pre-selected channels that look like good candidates."
		>
			<Card>
				<CardContent className="pt-6">
					<ChannelList
						channels={channels}
						selectedIds={channelSettings.indexingEnabled}
						onToggle={(channelId) =>
							toggleChannelSetting("indexingEnabled", channelId)
						}
						onSelectAll={(channelIds, enabled) =>
							setAllChannelSetting("indexingEnabled", channelIds, enabled)
						}
						emptyMessage="No channels found in your server."
					/>
				</CardContent>
			</Card>

			<WizardNav
				backHref={`/dashboard/${serverId}/onboarding/configure`}
				nextHref={`/dashboard/${serverId}/onboarding/configure/auto-thread`}
				isNextDisabled={channelSettings.indexingEnabled.size === 0}
			/>
		</StepLayout>
	);
}
