"use client";

import { Card, CardContent } from "@packages/ui/components/card";
import { ChannelList } from "../components/channel-list";
import { StepLayout } from "../components/step-layout";
import { WizardNav } from "../components/wizard-nav";
import { useWizard } from "../components/wizard-context";

export default function SolutionInstructionsPage() {
	const {
		serverId,
		channelSettings,
		toggleChannelSetting,
		setAllChannelSetting,
		getMarkSolutionChannels,
		getForumIndexedChannels,
	} = useWizard();

	const eligibleChannels = getMarkSolutionChannels();
	const hasEligibleChannels = eligibleChannels.length > 0;
	const forumChannels = getForumIndexedChannels();
	const hasForumChannels = forumChannels.length > 0;

	const nextHref = hasForumChannels
		? `/dashboard/${serverId}/onboarding/configure/solved-tags`
		: `/dashboard/${serverId}/onboarding/configure/complete`;

	return (
		<StepLayout
			title="Solution Instructions"
			description="When a new thread is created in these channels, the bot will post a message explaining how to mark a solution. This helps users learn the feature."
		>
			<Card>
				<CardContent className="pt-6">
					{hasEligibleChannels ? (
						<ChannelList
							channels={eligibleChannels}
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
							emptyMessage="No channels with mark solution enabled."
						/>
					) : (
						<div className="text-center py-8 text-muted-foreground">
							<p>No channels have mark solution enabled.</p>
							<p className="text-sm mt-2">
								Go back and enable mark solution on at least one channel to
								configure instructions.
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			<WizardNav
				backHref={`/dashboard/${serverId}/onboarding/configure/mark-solution`}
				nextHref={nextHref}
				showSkip={hasEligibleChannels}
			/>
		</StepLayout>
	);
}
