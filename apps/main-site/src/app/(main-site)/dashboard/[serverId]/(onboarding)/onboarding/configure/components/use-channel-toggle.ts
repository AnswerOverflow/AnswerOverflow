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
	const { configurations, setChannelConfigs } = useWizard();

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
		return new Set(
			configurations.filter(getEnabled).map((c) => c.channelId.toString()),
		);
	}, [configurations, getEnabled]);

	const handleToggle = (channelId: string) => {
		const id = BigInt(channelId);
		const newConfigs = configurations.map((c) => {
			if (c.channelId === id) {
				return setEnabled(c, !selectedIds.has(channelId));
			}
			return c;
		});
		setChannelConfigs(newConfigs);
	};

	const handleSelectAll = (channelIds: Array<string>, enabled: boolean) => {
		const idsToUpdate = new Set(channelIds);
		const newConfigs = configurations.map((c) => {
			if (idsToUpdate.has(c.channelId.toString())) {
				return setEnabled(c, enabled);
			}
			return c;
		});
		setChannelConfigs(newConfigs);
	};

	const handleSkip = () => {
		const channelIdsInScope = new Set(channels.map((c) => c.id.toString()));
		const newConfigs = configurations.map((c) => {
			if (channelIdsInScope.has(c.channelId.toString())) {
				return setEnabled(c, false);
			}
			return c;
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
