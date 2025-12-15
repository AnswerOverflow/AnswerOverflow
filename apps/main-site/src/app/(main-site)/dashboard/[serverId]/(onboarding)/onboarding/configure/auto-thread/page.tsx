"use client";

import { Card, CardContent } from "@packages/ui/components/card";
import { ChannelList } from "../components/channel-list";
import { StepLayout } from "../components/step-layout";
import { WizardNav } from "../components/wizard-nav";
import { useWizard } from "../components/wizard-context";

export default function AutoThreadPage() {
	const {
		serverId,
		channelSettings,
		toggleChannelSetting,
		setAllChannelSetting,
		getNonForumIndexedChannels,
	} = useWizard();

	const eligibleChannels = getNonForumIndexedChannels();
	const hasEligibleChannels = eligibleChannels.length > 0;

	return (
		<StepLayout
			title="Auto-Thread"
			description="When someone posts a message in these channels, the bot will automatically create a thread for the conversation. This keeps discussions organized."
		>
			<Card>
				<CardContent className="pt-6">
					{hasEligibleChannels ? (
						<ChannelList
							channels={eligibleChannels}
							selectedIds={channelSettings.autoThreadEnabled}
							onToggle={(channelId) =>
								toggleChannelSetting("autoThreadEnabled", channelId)
							}
							onSelectAll={(channelIds, enabled) =>
								setAllChannelSetting("autoThreadEnabled", channelIds, enabled)
							}
							emptyMessage="No eligible channels."
						/>
					) : (
						<div className="text-center py-8 text-muted-foreground">
							<p>
								No text or announcement channels were selected for indexing.
							</p>
							<p className="text-sm mt-2">
								Auto-thread is only available for non-forum channels.
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			<WizardNav
				backHref={`/dashboard/${serverId}/onboarding/configure/indexing`}
				nextHref={`/dashboard/${serverId}/onboarding/configure/mark-solution`}
				showSkip={hasEligibleChannels}
			/>
		</StepLayout>
	);
}
