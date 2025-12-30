"use client";

import { ChannelToggleStep } from "../components/channel-toggle-step";
import { useChannelToggle } from "../components/use-channel-toggle";
import { useWizard } from "../components/wizard-context";

export default function SolutionInstructionsPage() {
	const { serverId, allChannels, getAllForumChannels, getAIRecommendation } =
		useWizard();
	const hasForumChannels = getAllForumChannels().length > 0;

	const nextHref = hasForumChannels
		? `/dashboard/${serverId}/onboarding/configure/solved-tags`
		: `/dashboard/${serverId}/onboarding/configure/complete`;

	const {
		selectedIds,
		aiRecommendedIds,
		handleToggle,
		handleSelectAll,
		handleSkip,
	} = useChannelToggle({
		channels: allChannels,
		getAIRecommended: (id) =>
			getAIRecommendation(id)?.solutionInstructions ?? false,
		getEnabled: (c) => c.sendMarkSolutionInstructionsInNewThreads,
		setEnabled: (c, enabled) => ({
			...c,
			sendMarkSolutionInstructionsInNewThreads: enabled,
		}),
	});

	return (
		<ChannelToggleStep
			title="Solution Instructions"
			description="When a new thread is created in these channels, the bot will post a message explaining how to mark a solution. This helps users learn the feature."
			feature="solution-instructions"
			channels={allChannels}
			selectedIds={selectedIds}
			initialSelectedIds={aiRecommendedIds}
			onToggle={handleToggle}
			onSelectAll={handleSelectAll}
			backHref={`/dashboard/${serverId}/onboarding/configure/mark-solution`}
			nextHref={nextHref}
			showSkip
			onSkip={handleSkip}
		/>
	);
}
