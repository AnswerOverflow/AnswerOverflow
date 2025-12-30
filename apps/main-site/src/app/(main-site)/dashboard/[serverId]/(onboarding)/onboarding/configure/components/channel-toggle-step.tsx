"use client";

import type { FeaturePreviewPlaceholderProps } from "./mock-message-preview";
import { FeaturePreviewPlaceholder } from "./mock-message-preview";
import { StepLayout } from "./step-layout";
import { ChannelList } from "./toggle-channel-sections";
import { WizardCard } from "./wizard-card";
import type { ChannelInfo } from "./wizard-context";
import { WizardNav } from "./wizard-nav";

type ChannelToggleStepProps = {
	title: string;
	description: string;
	feature: FeaturePreviewPlaceholderProps["feature"];
	channels: Array<ChannelInfo>;
	selectedIds: Set<string>;
	initialSelectedIds?: Set<string>;
	onToggle: (channelId: string) => void;
	onSelectAll: (channelIds: Array<string>, enabled: boolean) => void;
	backHref: string;
	nextHref: string;
	showSkip?: boolean;
	isNextDisabled?: boolean;
	emptyState?: {
		title: string;
		description: string;
	};
	onSkip?: () => void;
};

export function ChannelToggleStep({
	title,
	description,
	feature,
	channels,
	selectedIds,
	initialSelectedIds,
	onToggle,
	onSelectAll,
	backHref,
	nextHref,
	showSkip,
	isNextDisabled,
	emptyState,
	onSkip,
}: ChannelToggleStepProps) {
	const hasChannels = channels.length > 0;

	return (
		<StepLayout
			title={title}
			description={description}
			video={
				hasChannels ? (
					<FeaturePreviewPlaceholder feature={feature} />
				) : undefined
			}
		>
			<WizardCard>
				{hasChannels ? (
					<ChannelList
						channels={channels}
						selectedIds={selectedIds}
						initialSelectedIds={initialSelectedIds}
						onToggle={onToggle}
						onSelectAll={onSelectAll}
					/>
				) : emptyState ? (
					<div className="text-center py-12 text-muted-foreground min-h-[200px] flex flex-col items-center justify-center">
						<p className="font-medium">{emptyState.title}</p>
						<p className="text-sm mt-1">{emptyState.description}</p>
					</div>
				) : (
					<div className="text-center py-12 text-muted-foreground min-h-[200px] flex items-center justify-center">
						No channels available
					</div>
				)}
			</WizardCard>

			<WizardNav
				backHref={backHref}
				nextHref={nextHref}
				showSkip={hasChannels && showSkip}
				isNextDisabled={isNextDisabled}
				onSkip={onSkip}
			/>
		</StepLayout>
	);
}
