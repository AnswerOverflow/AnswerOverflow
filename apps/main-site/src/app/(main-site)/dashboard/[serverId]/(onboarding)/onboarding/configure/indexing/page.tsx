"use client";

import { ChannelToggleStep } from "../components/channel-toggle-step";
import { useChannelToggle } from "../components/use-channel-toggle";
import { useWizard } from "../components/wizard-context";

export default function IndexingPage() {
	const { serverId, allChannels, getAIRecommendation } = useWizard();

	const {
		selectedIds,
		aiRecommendedIds,
		handleToggle,
		handleSelectAll,
		handleSkip,
	} = useChannelToggle({
		channels: allChannels,
		getAIRecommended: (id) => getAIRecommendation(id)?.indexing ?? false,
		getEnabled: (c) => c.indexingEnabled,
		setEnabled: (c, enabled) => ({ ...c, indexingEnabled: enabled }),
	});

	return (
		<ChannelToggleStep
			title="Enable Indexing"
			description="Select which channels should be searchable on the web. We've pre-selected channels that look like good candidates."
			feature="indexing"
			channels={allChannels}
			selectedIds={selectedIds}
			initialSelectedIds={aiRecommendedIds}
			onToggle={handleToggle}
			onSelectAll={handleSelectAll}
			backHref={`/dashboard/${serverId}/onboarding/configure`}
			nextHref={`/dashboard/${serverId}/onboarding/configure/auto-thread`}
			showSkip
			onSkip={handleSkip}
		/>
	);
}
