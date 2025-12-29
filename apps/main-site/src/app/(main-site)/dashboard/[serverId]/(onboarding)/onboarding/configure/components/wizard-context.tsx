"use client";

import { api } from "@packages/database/convex/_generated/api";
import { useAction } from "convex/react";
import { useParams } from "next/navigation";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

const CHANNEL_TYPE_FORUM = 15;

export type ForumTagInfo = {
	id: bigint;
	name: string;
	moderated: boolean;
	emojiId?: bigint;
	emojiName?: string;
};

export type ChannelRecommendation = {
	id: bigint;
	name: string;
	type: number;
	shouldIndex: boolean;
	availableTags?: Array<ForumTagInfo>;
	recommendedSolvedTagId?: bigint;
};

type ServerSettings = {
	publicMessages: boolean;
	anonymizeUsernames: boolean;
};

type ChannelSettings = {
	indexingEnabled: Set<string>;
	autoThreadEnabled: Set<string>;
	markSolutionEnabled: Set<string>;
	solutionInstructionsEnabled: Set<string>;
	solvedTags: Map<string, string>;
};

type WizardState = {
	isLoading: boolean;
	error: string | null;
	channels: Array<ChannelRecommendation>;
	serverSettings: ServerSettings;
	channelSettings: ChannelSettings;
};

type WizardContextValue = WizardState & {
	serverId: string;
	setServerSettings: (settings: Partial<ServerSettings>) => void;
	toggleChannelSetting: (
		setting: keyof Omit<ChannelSettings, "solvedTags">,
		channelId: string,
	) => void;
	setAllChannelSetting: (
		setting: keyof Omit<ChannelSettings, "solvedTags">,
		channelIds: Array<string>,
		enabled: boolean,
	) => void;
	setSolvedTag: (channelId: string, tagId: string | undefined) => void;
	getIndexedChannels: () => Array<ChannelRecommendation>;
	getNonForumIndexedChannels: () => Array<ChannelRecommendation>;
	getForumIndexedChannels: () => Array<ChannelRecommendation>;
	getAllNonForumChannels: () => Array<ChannelRecommendation>;
	getAllForumChannels: () => Array<ChannelRecommendation>;
	getMarkSolutionChannels: () => Array<ChannelRecommendation>;
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
		channels: [],
		serverSettings: {
			publicMessages: true,
			anonymizeUsernames: false,
		},
		channelSettings: {
			indexingEnabled: new Set(),
			autoThreadEnabled: new Set(),
			markSolutionEnabled: new Set(),
			solutionInstructionsEnabled: new Set(),
			solvedTags: new Map(),
		},
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

			const indexingEnabled = new Set<string>();
			const autoThreadEnabled = new Set<string>();
			const markSolutionEnabled = new Set<string>();
			const solutionInstructionsEnabled = new Set<string>();
			const solvedTags = new Map<string, string>();

			const channels: Array<ChannelRecommendation> = config.channels.map(
				(channel) => {
					const channelId = channel.id.toString();

					if (channel.recommendedSettings.indexingEnabled) {
						indexingEnabled.add(channelId);
					}
					if (channel.recommendedSettings.autoThreadEnabled) {
						autoThreadEnabled.add(channelId);
					}
					if (channel.recommendedSettings.markSolutionEnabled) {
						markSolutionEnabled.add(channelId);
					}
					if (
						channel.recommendedSettings.sendMarkSolutionInstructionsInNewThreads
					) {
						solutionInstructionsEnabled.add(channelId);
					}
					if (channel.recommendedSettings.solutionTagId) {
						solvedTags.set(
							channelId,
							channel.recommendedSettings.solutionTagId.toString(),
						);
					}

					return {
						id: channel.id,
						name: channel.name,
						type: channel.type,
						shouldIndex: channel.shouldIndex,
						availableTags: channel.availableTags,
						recommendedSolvedTagId: channel.recommendedSettings.solutionTagId,
					};
				},
			);

			setState({
				isLoading: false,
				error: null,
				channels,
				serverSettings: {
					publicMessages: true,
					anonymizeUsernames: false,
				},
				channelSettings: {
					indexingEnabled,
					autoThreadEnabled,
					markSolutionEnabled,
					solutionInstructionsEnabled,
					solvedTags,
				},
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

	const toggleChannelSetting = useCallback(
		(setting: keyof Omit<ChannelSettings, "solvedTags">, channelId: string) => {
			setState((prev) => {
				const newSet = new Set(prev.channelSettings[setting]);
				if (newSet.has(channelId)) {
					newSet.delete(channelId);
				} else {
					newSet.add(channelId);
				}
				return {
					...prev,
					channelSettings: {
						...prev.channelSettings,
						[setting]: newSet,
					},
				};
			});
		},
		[],
	);

	const setAllChannelSetting = useCallback(
		(
			setting: keyof Omit<ChannelSettings, "solvedTags">,
			channelIds: Array<string>,
			enabled: boolean,
		) => {
			setState((prev) => {
				const newSet = new Set(prev.channelSettings[setting]);
				for (const channelId of channelIds) {
					if (enabled) {
						newSet.add(channelId);
					} else {
						newSet.delete(channelId);
					}
				}
				return {
					...prev,
					channelSettings: {
						...prev.channelSettings,
						[setting]: newSet,
					},
				};
			});
		},
		[],
	);

	const setSolvedTag = useCallback(
		(channelId: string, tagId: string | undefined) => {
			setState((prev) => {
				const newMap = new Map(prev.channelSettings.solvedTags);
				if (tagId) {
					newMap.set(channelId, tagId);
				} else {
					newMap.delete(channelId);
				}
				return {
					...prev,
					channelSettings: {
						...prev.channelSettings,
						solvedTags: newMap,
					},
				};
			});
		},
		[],
	);

	const getIndexedChannels = useCallback(() => {
		return state.channels.filter((c) =>
			state.channelSettings.indexingEnabled.has(c.id.toString()),
		);
	}, [state.channels, state.channelSettings.indexingEnabled]);

	const getNonForumIndexedChannels = useCallback(() => {
		return getIndexedChannels().filter((c) => c.type !== CHANNEL_TYPE_FORUM);
	}, [getIndexedChannels]);

	const getForumIndexedChannels = useCallback(() => {
		return getIndexedChannels().filter((c) => c.type === CHANNEL_TYPE_FORUM);
	}, [getIndexedChannels]);

	const getAllNonForumChannels = useCallback(() => {
		return state.channels.filter((c) => c.type !== CHANNEL_TYPE_FORUM);
	}, [state.channels]);

	const getAllForumChannels = useCallback(() => {
		return state.channels.filter((c) => c.type === CHANNEL_TYPE_FORUM);
	}, [state.channels]);

	const getMarkSolutionChannels = useCallback(() => {
		return state.channels.filter((c) =>
			state.channelSettings.markSolutionEnabled.has(c.id.toString()),
		);
	}, [state.channels, state.channelSettings.markSolutionEnabled]);

	const value: WizardContextValue = {
		...state,
		serverId,
		setServerSettings,
		toggleChannelSetting,
		setAllChannelSetting,
		setSolvedTag,
		getIndexedChannels,
		getNonForumIndexedChannels,
		getForumIndexedChannels,
		getAllNonForumChannels,
		getAllForumChannels,
		getMarkSolutionChannels,
		reload: loadConfiguration,
	};

	return (
		<WizardContext.Provider value={value}>{children}</WizardContext.Provider>
	);
}
