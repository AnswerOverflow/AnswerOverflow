"use client";

import { useMemo } from "react";
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
};

export function useChannelToggle({
	channels,
	getAIRecommended,
	getEnabled,
	setEnabled,
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

	const selectedIds = useMemo(() => {
		const fromConfigs = new Set(
			configurations.filter(getEnabled).map((c) => c.channelId.toString()),
		);
		return fromConfigs.size > 0 ? fromConfigs : aiRecommendedIds;
	}, [configurations, getEnabled, aiRecommendedIds]);

	const ensureConfigExists = (channelId: bigint): ChannelConfiguration => {
		const existing = configurations.find((c) => c.channelId === channelId);
		if (existing) return existing;
		return {
			channelId,
			indexingEnabled: false,
			autoThreadEnabled: false,
			markSolutionEnabled: false,
			sendMarkSolutionInstructionsInNewThreads: false,
			solutionTagId: undefined,
		};
	};

	const handleToggle = (channelId: string) => {
		const id = BigInt(channelId);
		const config = ensureConfigExists(id);
		const isCurrentlyEnabled = selectedIds.has(channelId);
		const updated = setEnabled(config, !isCurrentlyEnabled);

		const existingIndex = configurations.findIndex((c) => c.channelId === id);
		if (existingIndex >= 0) {
			const newConfigs = [...configurations];
			newConfigs[existingIndex] = updated;
			setChannelConfigs(newConfigs);
		} else {
			setChannelConfigs([...configurations, updated]);
		}
	};

	const handleSelectAll = (channelIds: Array<string>, enabled: boolean) => {
		const updates = new Map<string, ChannelConfiguration>();

		for (const channelId of channelIds) {
			const id = BigInt(channelId);
			const config = ensureConfigExists(id);
			updates.set(channelId, setEnabled(config, enabled));
		}

		const newConfigs = configurations.map((c) => {
			const update = updates.get(c.channelId.toString());
			if (update) {
				updates.delete(c.channelId.toString());
				return update;
			}
			return c;
		});

		for (const config of updates.values()) {
			newConfigs.push(config);
		}

		setChannelConfigs(newConfigs);
	};

	const handleSkip = () => {
		const channelIdsInScope = new Set(channels.map((c) => c.id.toString()));

		const newConfigs = allChannels.map((channel) => {
			const existing = configurations.find((c) => c.channelId === channel.id);
			const base = existing ?? {
				channelId: channel.id,
				indexingEnabled: false,
				autoThreadEnabled: false,
				markSolutionEnabled: false,
				sendMarkSolutionInstructionsInNewThreads: false,
				solutionTagId: undefined,
			};
			if (channelIdsInScope.has(channel.id.toString())) {
				return setEnabled(base, false);
			}
			return base;
		});

		setChannelConfigs(newConfigs);
	};

	return {
		selectedIds,
		aiRecommendedIds,
		handleToggle,
		handleSelectAll,
		handleSkip,
	};
}
