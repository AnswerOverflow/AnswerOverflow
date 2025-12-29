"use client";

import { ChannelToggleStep } from "../components/channel-toggle-step";
import { useChannelToggle } from "../components/use-channel-toggle";
import { useWizard } from "../components/wizard-context";

export default function MarkSolutionPage() {
	const { serverId, allChannels, getAIRecommendation } = useWizard();

	const {
		selectedIds,
		aiRecommendedIds,
		handleToggle,
		handleSelectAll,
		handleSkip,
	} = useChannelToggle({
		channels: allChannels,
		getAIRecommended: (id) => getAIRecommendation(id)?.markSolution ?? false,
		getEnabled: (c) => c.markSolutionEnabled,
		setEnabled: (c, enabled) => ({ ...c, markSolutionEnabled: enabled }),
	});

	return (
		<ChannelToggleStep
			title="Mark Solution"
			description="In these channels, users can mark a message as the answer to their question. This highlights the solution and helps others find answers faster."
			feature="mark-solution"
			channels={allChannels}
			selectedIds={selectedIds}
			initialSelectedIds={aiRecommendedIds}
			onToggle={handleToggle}
			onSelectAll={handleSelectAll}
			backHref={`/dashboard/${serverId}/onboarding/configure/auto-thread`}
			nextHref={`/dashboard/${serverId}/onboarding/configure/solution-instructions`}
			showSkip
			onSkip={handleSkip}
		/>
	);
}
