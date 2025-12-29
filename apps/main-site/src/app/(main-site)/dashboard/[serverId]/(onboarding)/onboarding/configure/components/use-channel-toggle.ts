"use client";

import { useMemo, useState } from "react";
import type { ChannelConfiguration, ChannelInfo } from "./wizard-context";
import { useWizard } from "./wizard-context";

type UseChannelToggleOptions = {
	channels: Array<ChannelInfo>;
	getAIRecommended: (channelId: string) => boolean;
	getEnabled: (config: ChannelConfiguration) => boolean;
	setEnabled: (
		config: ChannelConfiguration,
		enabled: boolean,
	) => ChannelConfiguration;
	isFirstStep?: boolean;
};

export function useChannelToggle({
	channels,
	getAIRecommended,
	getEnabled,
	setEnabled,
	isFirstStep = false,
}: UseChannelToggleOptions) {
	const { allChannels, configurations, setChannelConfigs } = useWizard();

	const aiRecommendedIds = useMemo(() => {
		const ids = new Set<string>();
		for (const channel of channels) {
			if (getAIRecommended(channel.id.toString())) {
				ids.add(channel.id.toString());
			}
		}
		return ids;
	}, [channels, getAIRecommended]);

	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
		const existing = new Set(
			configurations.filter(getEnabled).map((c) => c.channelId.toString()),
		);
		return existing.size > 0 ? existing : aiRecommendedIds;
	});

	const handleToggle = (channelId: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(channelId)) {
				next.delete(channelId);
			} else {
				next.add(channelId);
			}
			return next;
		});
	};

	const handleSelectAll = (channelIds: Array<string>, enabled: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			for (const id of channelIds) {
				if (enabled) {
					next.add(id);
				} else {
					next.delete(id);
				}
			}
			return next;
		});
	};

	const commitSelections = () => {
		if (isFirstStep) {
			const newConfigs = allChannels.map((channel) => {
				const existing = configurations.find((c) => c.channelId === channel.id);
				const base: ChannelConfiguration = existing ?? {
					channelId: channel.id,
					indexingEnabled: false,
					autoThreadEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					solutionTagId: undefined,
				};
				return setEnabled(base, selectedIds.has(channel.id.toString()));
			});
			setChannelConfigs(newConfigs);
		} else {
			const updatedConfigs = configurations.map((config) =>
				setEnabled(config, selectedIds.has(config.channelId.toString())),
			);
			setChannelConfigs(updatedConfigs);
		}
	};

	const handleSkip = () => {
		if (isFirstStep) {
			const newConfigs = allChannels.map((channel) => {
				const existing = configurations.find((c) => c.channelId === channel.id);
				const base: ChannelConfiguration = existing ?? {
					channelId: channel.id,
					indexingEnabled: false,
					autoThreadEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					solutionTagId: undefined,
				};
				return setEnabled(base, false);
			});
			setChannelConfigs(newConfigs);
		} else {
			const updatedConfigs = configurations.map((config) =>
				setEnabled(config, false),
			);
			setChannelConfigs(updatedConfigs);
		}
	};

	return {
		selectedIds,
		aiRecommendedIds,
		handleToggle,
		handleSelectAll,
		commitSelections,
		handleSkip,
	};
}
