"use client";

import { ChannelToggleStep } from "../components/channel-toggle-step";
import { useChannelToggle } from "../components/use-channel-toggle";
import { useWizard } from "../components/wizard-context";

export default function AutoThreadPage() {
	const { serverId, getAllNonForumChannels, getAIRecommendation } = useWizard();
	const channels = getAllNonForumChannels();

	const {
		selectedIds,
		aiRecommendedIds,
		handleToggle,
		handleSelectAll,
		handleSkip,
	} = useChannelToggle({
		channels,
		getAIRecommended: (id) => getAIRecommendation(id)?.autoThread ?? false,
		getEnabled: (c) => c.autoThreadEnabled,
		setEnabled: (c, enabled) => ({ ...c, autoThreadEnabled: enabled }),
	});

	return (
		<ChannelToggleStep
			title="Auto-Thread"
			description="When someone posts a message in these channels, the bot will automatically create a thread for the conversation. This keeps discussions organized."
			feature="auto-thread"
			channels={channels}
			selectedIds={selectedIds}
			initialSelectedIds={aiRecommendedIds}
			onToggle={handleToggle}
			onSelectAll={handleSelectAll}
			backHref={`/dashboard/${serverId}/onboarding/configure/indexing`}
			nextHref={`/dashboard/${serverId}/onboarding/configure/mark-solution`}
			showSkip
			emptyState={{
				title: "No text or announcement channels in your server.",
				description: "Auto-thread is only available for non-forum channels.",
			}}
			onSkip={handleSkip}
		/>
	);
}
