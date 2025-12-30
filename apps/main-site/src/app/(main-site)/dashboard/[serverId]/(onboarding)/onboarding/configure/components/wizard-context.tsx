"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { RecommendedConfiguration } from "@packages/database/convex/authenticated/onboarding_action";
import type { ForumTag } from "@packages/database/convex/schema";
import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { ChannelType } from "discord-api-types/v10";
import { useParams } from "next/navigation";
import { createContext, useCallback, useContext, useState } from "react";

export type ForumTagInfo = ForumTag;

export type ChannelInfo = RecommendedConfiguration["channels"][number] extends {
	id: infer Id;
	name: infer Name;
	type: infer Type;
	availableTags?: infer Tags;
}
	? { id: Id; name: Name; type: Type; availableTags?: Tags }
	: never;

export type ChannelConfiguration = {
	channelId: bigint;
	indexingEnabled: boolean;
	autoThreadEnabled: boolean;
	markSolutionEnabled: boolean;
	sendMarkSolutionInstructionsInNewThreads: boolean;
	solutionTagId?: bigint;
};

type AIRecommendation = {
	indexing: boolean;
	autoThread: boolean;
	markSolution: boolean;
	solutionInstructions: boolean;
	solutionTagId?: bigint;
};

type ServerSettings = RecommendedConfiguration["serverSettings"];

type WizardState = {
	isLoading: boolean;
	error: string | null;
	allChannels: Array<ChannelInfo>;
	configurations: Array<ChannelConfiguration>;
	serverSettings: ServerSettings;
	aiRecommendations: Map<string, AIRecommendation>;
};

type WizardContextValue = WizardState & {
	serverId: string;
	setServerSettings: (settings: Partial<ServerSettings>) => void;
	updateChannelConfig: (
		channelId: bigint,
		config: Partial<Omit<ChannelConfiguration, "channelId">>,
	) => void;
	setChannelConfigs: (configs: Array<ChannelConfiguration>) => void;
	getChannelConfig: (channelId: bigint) => ChannelConfiguration | undefined;
	getAllChannels: () => Array<ChannelInfo>;
	getAllForumChannels: () => Array<ChannelInfo>;
	getAllNonForumChannels: () => Array<ChannelInfo>;
	getConfiguredChannels: () => Array<ChannelConfiguration>;
	getAIRecommendation: (channelId: string) => AIRecommendation | undefined;
	reload: () => Promise<void>;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard() {
	const context = useContext(WizardContext);
	if (!context) {
		throw new Error("useWizard must be used within WizardProvider");
	}
	return context;
}

export function WizardProvider({ children }: { children: React.ReactNode }) {
	const params = useParams();
	const serverId = params.serverId as string;

	const getRecommendedConfiguration = useAction(
		api.authenticated.onboarding_action.getRecommendedConfiguration,
	);

	const {
		data: configData,
		isLoading,
		error,
		refetch,
	} = useTanstackQuery({
		queryKey: ["wizard-configuration", serverId],
		queryFn: async () => {
			const config = await getRecommendedConfiguration({
				serverId: BigInt(serverId),
			});

			const allChannels: Array<ChannelInfo> = config.channels.map(
				(channel) => ({
					id: channel.id,
					name: channel.name,
					type: channel.type,
					availableTags: channel.availableTags,
				}),
			);

			const aiRecommendations = new Map<string, AIRecommendation>();
			const initialConfigurations: Array<ChannelConfiguration> = [];

			for (const channel of config.channels) {
				const rec = channel.recommendedSettings;
				aiRecommendations.set(channel.id.toString(), {
					indexing: rec.indexingEnabled,
					autoThread: rec.autoThreadEnabled,
					markSolution: rec.markSolutionEnabled,
					solutionInstructions: rec.sendMarkSolutionInstructionsInNewThreads,
					solutionTagId: rec.solutionTagId,
				});

				initialConfigurations.push({
					channelId: channel.id,
					indexingEnabled: rec.indexingEnabled,
					autoThreadEnabled: rec.autoThreadEnabled,
					markSolutionEnabled: rec.markSolutionEnabled,
					sendMarkSolutionInstructionsInNewThreads:
						rec.sendMarkSolutionInstructionsInNewThreads,
					solutionTagId: rec.solutionTagId,
				});
			}

			return {
				allChannels,
				configurations: initialConfigurations,
				serverSettings: config.serverSettings,
				aiRecommendations,
			};
		},
		enabled: !!serverId,
	});

	const [configurationsOverride, setConfigurationsOverride] =
		useState<Array<ChannelConfiguration> | null>(null);
	const [serverSettingsOverride, setServerSettingsOverride] =
		useState<ServerSettings | null>(null);

	const configurations =
		configurationsOverride ?? configData?.configurations ?? [];
	const serverSettings = serverSettingsOverride ??
		configData?.serverSettings ?? {
			considerAllMessagesPublicEnabled: true,
			anonymizeMessagesEnabled: false,
		};
	const allChannels = configData?.allChannels ?? [];
	const aiRecommendations = configData?.aiRecommendations ?? new Map();

	const setServerSettings = useCallback(
		(settings: Partial<ServerSettings>) => {
			setServerSettingsOverride((prev) => ({
				...(prev ??
					configData?.serverSettings ?? {
						considerAllMessagesPublicEnabled: true,
						anonymizeMessagesEnabled: false,
					}),
				...settings,
			}));
		},
		[configData?.serverSettings],
	);

	const updateChannelConfig = useCallback(
		(
			channelId: bigint,
			config: Partial<Omit<ChannelConfiguration, "channelId">>,
		) => {
			setConfigurationsOverride((prev) => {
				const currentConfigs = prev ?? configData?.configurations ?? [];
				const existingIndex = currentConfigs.findIndex(
					(c) => c.channelId === channelId,
				);

				if (existingIndex >= 0) {
					const existing = currentConfigs[existingIndex];
					if (!existing) return currentConfigs;
					const updated = [...currentConfigs];
					const updatedConfig: ChannelConfiguration = {
						channelId: existing.channelId,
						indexingEnabled: config.indexingEnabled ?? existing.indexingEnabled,
						autoThreadEnabled:
							config.autoThreadEnabled ?? existing.autoThreadEnabled,
						markSolutionEnabled:
							config.markSolutionEnabled ?? existing.markSolutionEnabled,
						sendMarkSolutionInstructionsInNewThreads:
							config.sendMarkSolutionInstructionsInNewThreads ??
							existing.sendMarkSolutionInstructionsInNewThreads,
						solutionTagId: config.solutionTagId ?? existing.solutionTagId,
					};
					updated[existingIndex] = updatedConfig;
					return updated;
				}

				const newConfig: ChannelConfiguration = {
					channelId,
					indexingEnabled: config.indexingEnabled ?? false,
					autoThreadEnabled: config.autoThreadEnabled ?? false,
					markSolutionEnabled: config.markSolutionEnabled ?? false,
					sendMarkSolutionInstructionsInNewThreads:
						config.sendMarkSolutionInstructionsInNewThreads ?? false,
					solutionTagId: config.solutionTagId,
				};
				return [...currentConfigs, newConfig];
			});
		},
		[configData?.configurations],
	);

	const setChannelConfigs = useCallback(
		(configs: Array<ChannelConfiguration>) => {
			setConfigurationsOverride(configs);
		},
		[],
	);

	const getChannelConfig = useCallback(
		(channelId: bigint) => {
			return configurations.find((c) => c.channelId === channelId);
		},
		[configurations],
	);

	const getAllChannels = useCallback(() => {
		return allChannels;
	}, [allChannels]);

	const getAllForumChannels = useCallback(() => {
		return allChannels.filter((c) => c.type === ChannelType.GuildForum);
	}, [allChannels]);

	const getAllNonForumChannels = useCallback(() => {
		return allChannels.filter((c) => c.type !== ChannelType.GuildForum);
	}, [allChannels]);

	const getConfiguredChannels = useCallback(() => {
		return configurations.filter(
			(c) =>
				c.indexingEnabled ||
				c.autoThreadEnabled ||
				c.markSolutionEnabled ||
				c.sendMarkSolutionInstructionsInNewThreads ||
				c.solutionTagId !== undefined,
		);
	}, [configurations]);

	const getAIRecommendation = useCallback(
		(channelId: string) => {
			return aiRecommendations.get(channelId);
		},
		[aiRecommendations],
	);

	const reload = useCallback(async () => {
		setConfigurationsOverride(null);
		setServerSettingsOverride(null);
		await refetch();
	}, [refetch]);

	const value: WizardContextValue = {
		isLoading,
		error: error ? "Failed to load channel data. Please try again." : null,
		allChannels,
		configurations,
		serverSettings,
		aiRecommendations,
		serverId,
		setServerSettings,
		updateChannelConfig,
		setChannelConfigs,
		getChannelConfig,
		getAllChannels,
		getAllForumChannels,
		getAllNonForumChannels,
		getConfiguredChannels,
		getAIRecommendation,
		reload,
	};

	return (
		<WizardContext.Provider value={value}>{children}</WizardContext.Provider>
	);
}
