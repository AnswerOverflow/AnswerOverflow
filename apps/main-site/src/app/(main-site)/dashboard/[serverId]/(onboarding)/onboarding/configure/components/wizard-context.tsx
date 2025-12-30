"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { RecommendedConfiguration } from "@packages/database/convex/authenticated/onboarding_action";
import type { ForumTag } from "@packages/database/convex/schema";
import { useAction } from "convex/react";
import { ChannelType } from "discord-api-types/v10";
import { useParams } from "next/navigation";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

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

	const [state, setState] = useState<WizardState>({
		isLoading: true,
		error: null,
		allChannels: [],
		configurations: [],
		serverSettings: {
			considerAllMessagesPublicEnabled: true,
			anonymizeMessagesEnabled: false,
		},
		aiRecommendations: new Map(),
	});

	const getRecommendedConfiguration = useAction(
		api.authenticated.onboarding_action.getRecommendedConfiguration,
	);

	const loadConfiguration = useCallback(async () => {
		if (!serverId) return;

		setState((prev) => ({ ...prev, isLoading: true, error: null }));

		try {
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

			setState({
				isLoading: false,
				error: null,
				allChannels,
				configurations: initialConfigurations,
				serverSettings: config.serverSettings,
				aiRecommendations,
			});
		} catch (error) {
			console.error("Failed to load configuration:", error);
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: "Failed to load channel data. Please try again.",
			}));
		}
	}, [serverId, getRecommendedConfiguration]);

	useEffect(() => {
		loadConfiguration();
	}, [loadConfiguration]);

	const setServerSettings = useCallback((settings: Partial<ServerSettings>) => {
		setState((prev) => ({
			...prev,
			serverSettings: { ...prev.serverSettings, ...settings },
		}));
	}, []);

	const updateChannelConfig = useCallback(
		(
			channelId: bigint,
			config: Partial<Omit<ChannelConfiguration, "channelId">>,
		) => {
			setState((prev) => {
				const existingIndex = prev.configurations.findIndex(
					(c) => c.channelId === channelId,
				);

				if (existingIndex >= 0) {
					const existing = prev.configurations[existingIndex];
					if (!existing) return prev;
					const updated = [...prev.configurations];
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
					return { ...prev, configurations: updated };
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
				return { ...prev, configurations: [...prev.configurations, newConfig] };
			});
		},
		[],
	);

	const setChannelConfigs = useCallback(
		(configs: Array<ChannelConfiguration>) => {
			setState((prev) => ({ ...prev, configurations: configs }));
		},
		[],
	);

	const getChannelConfig = useCallback(
		(channelId: bigint) => {
			return state.configurations.find((c) => c.channelId === channelId);
		},
		[state.configurations],
	);

	const getAllChannels = useCallback(() => {
		return state.allChannels;
	}, [state.allChannels]);

	const getAllForumChannels = useCallback(() => {
		return state.allChannels.filter((c) => c.type === ChannelType.GuildForum);
	}, [state.allChannels]);

	const getAllNonForumChannels = useCallback(() => {
		return state.allChannels.filter((c) => c.type !== ChannelType.GuildForum);
	}, [state.allChannels]);

	const getConfiguredChannels = useCallback(() => {
		return state.configurations.filter(
			(c) =>
				c.indexingEnabled ||
				c.autoThreadEnabled ||
				c.markSolutionEnabled ||
				c.sendMarkSolutionInstructionsInNewThreads ||
				c.solutionTagId !== undefined,
		);
	}, [state.configurations]);

	const getAIRecommendation = useCallback(
		(channelId: string) => {
			return state.aiRecommendations.get(channelId);
		},
		[state.aiRecommendations],
	);

	const value: WizardContextValue = {
		...state,
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
		reload: loadConfiguration,
	};

	return (
		<WizardContext.Provider value={value}>{children}</WizardContext.Provider>
	);
}
