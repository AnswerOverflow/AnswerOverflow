"use client";

import { ChannelToggleStep } from "../components/channel-toggle-step";
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

	const forumChannels = getAllForumChannels();
	const hasForumChannels = forumChannels.length > 0;

	const nextHref = hasForumChannels
		? `/dashboard/${serverId}/onboarding/configure/solved-tags`
		: `/dashboard/${serverId}/onboarding/configure/complete`;

	return (
		<ChannelToggleStep
			title="Solution Instructions"
			description="When a new thread is created in these channels, the bot will post a message explaining how to mark a solution. This helps users learn the feature."
			feature="solution-instructions"
			channels={channels}
			selectedIds={channelSettings.solutionInstructionsEnabled}
			onToggle={(channelId) =>
				toggleChannelSetting("solutionInstructionsEnabled", channelId)
			}
			onSelectAll={(channelIds, enabled) =>
				setAllChannelSetting("solutionInstructionsEnabled", channelIds, enabled)
			}
			backHref={`/dashboard/${serverId}/onboarding/configure/mark-solution`}
			nextHref={nextHref}
			showSkip
		/>
	);
}
