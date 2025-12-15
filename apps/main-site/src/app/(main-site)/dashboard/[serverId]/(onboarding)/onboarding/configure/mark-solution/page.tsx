"use client";

import { Card, CardContent } from "@packages/ui/components/card";
import { ChannelList } from "../components/channel-list";
import { StepLayout } from "../components/step-layout";
import { WizardNav } from "../components/wizard-nav";
import { useWizard } from "../components/wizard-context";

export default function MarkSolutionPage() {
	const {
		serverId,
		channelSettings,
		toggleChannelSetting,
		setAllChannelSetting,
		getIndexedChannels,
	} = useWizard();

	const eligibleChannels = getIndexedChannels();

	return (
		<StepLayout
			title="Mark Solution"
			description="In these channels, users can mark a message as the answer to their question. This highlights the solution and helps others find answers faster."
		>
			<Card>
				<CardContent className="pt-6">
					<ChannelList
						channels={eligibleChannels}
						selectedIds={channelSettings.markSolutionEnabled}
						onToggle={(channelId) =>
							toggleChannelSetting("markSolutionEnabled", channelId)
						}
						onSelectAll={(channelIds, enabled) =>
							setAllChannelSetting("markSolutionEnabled", channelIds, enabled)
						}
						emptyMessage="No channels selected for indexing."
					/>
				</CardContent>
			</Card>

			<WizardNav
				backHref={`/dashboard/${serverId}/onboarding/configure/auto-thread`}
				nextHref={`/dashboard/${serverId}/onboarding/configure/solution-instructions`}
				showSkip
			/>
		</StepLayout>
	);
}
