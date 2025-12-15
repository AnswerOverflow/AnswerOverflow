"use client";

import { ChannelToggleStep } from "../components/channel-toggle-step";
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

	return (
		<ChannelToggleStep
			title="Auto-Thread"
			description="When someone posts a message in these channels, the bot will automatically create a thread for the conversation. This keeps discussions organized."
			feature="auto-thread"
			channels={allNonForumChannels}
			selectedIds={channelSettings.autoThreadEnabled}
			onToggle={(channelId) =>
				toggleChannelSetting("autoThreadEnabled", channelId)
			}
			onSelectAll={(channelIds, enabled) =>
				setAllChannelSetting("autoThreadEnabled", channelIds, enabled)
			}
			backHref={`/dashboard/${serverId}/onboarding/configure/indexing`}
			nextHref={`/dashboard/${serverId}/onboarding/configure/mark-solution`}
			showSkip
			emptyState={{
				title: "No text or announcement channels in your server.",
				description: "Auto-thread is only available for non-forum channels.",
			}}
		/>
	);
}
