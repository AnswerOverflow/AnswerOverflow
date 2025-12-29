"use client";

import { ChannelToggleStep } from "../components/channel-toggle-step";
import { useWizard } from "../components/wizard-context";

export default function IndexingPage() {
	const {
		serverId,
		channels,
		channelSettings,
		toggleChannelSetting,
		setAllChannelSetting,
	} = useWizard();

	const handleSkip = () => {
		const allChannelIds = channels.map((c) => c.id.toString());
		setAllChannelSetting("indexingEnabled", allChannelIds, false);
	};

	return (
		<ChannelToggleStep
			title="Enable Indexing"
			description="Select which channels should be searchable on the web. We've pre-selected channels that look like good candidates."
			feature="indexing"
			channels={channels}
			selectedIds={channelSettings.indexingEnabled}
			onToggle={(channelId) =>
				toggleChannelSetting("indexingEnabled", channelId)
			}
			onSelectAll={(channelIds, enabled) =>
				setAllChannelSetting("indexingEnabled", channelIds, enabled)
			}
			backHref={`/dashboard/${serverId}/onboarding/configure`}
			nextHref={`/dashboard/${serverId}/onboarding/configure/auto-thread`}
			isNextDisabled={channelSettings.indexingEnabled.size === 0}
			showSkip
			onSkip={handleSkip}
		/>
	);
}
