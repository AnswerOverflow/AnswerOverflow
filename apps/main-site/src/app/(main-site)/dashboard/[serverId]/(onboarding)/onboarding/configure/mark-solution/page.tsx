"use client";

import { ChannelToggleStep } from "../components/channel-toggle-step";
import { useWizard } from "../components/wizard-context";

export default function MarkSolutionPage() {
	const {
		serverId,
		channels,
		channelSettings,
		toggleChannelSetting,
		setAllChannelSetting,
	} = useWizard();

	const handleSkip = () => {
		const allChannelIds = channels.map((c) => c.id.toString());
		setAllChannelSetting("markSolutionEnabled", allChannelIds, false);
	};

	return (
		<ChannelToggleStep
			title="Mark Solution"
			description="In these channels, users can mark a message as the answer to their question. This highlights the solution and helps others find answers faster."
			feature="mark-solution"
			channels={channels}
			selectedIds={channelSettings.markSolutionEnabled}
			onToggle={(channelId) =>
				toggleChannelSetting("markSolutionEnabled", channelId)
			}
			onSelectAll={(channelIds, enabled) =>
				setAllChannelSetting("markSolutionEnabled", channelIds, enabled)
			}
			backHref={`/dashboard/${serverId}/onboarding/configure/auto-thread`}
			nextHref={`/dashboard/${serverId}/onboarding/configure/solution-instructions`}
			showSkip
			onSkip={handleSkip}
		/>
	);
}
