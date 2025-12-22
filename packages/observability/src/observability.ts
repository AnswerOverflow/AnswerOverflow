import * as Layer from "effect/Layer";

import { createAxiomLayer, type AxiomConfig } from "./axiom";
import {
	createSentryEffectLayer,
	type SentryEffectConfig,
} from "./sentry-effect";

export type ObservabilityConfig = {
	sentry?: SentryEffectConfig;
	axiom?: AxiomConfig;
};

export const createObservabilityLayer = (
	config: ObservabilityConfig,
): Layer.Layer<never> => {
	const sentryLayer = config.sentry?.dsn
		? createSentryEffectLayer(config.sentry)
		: null;

	const axiomLayer = config.axiom?.apiToken
		? createAxiomLayer(config.axiom)
		: null;

	if (sentryLayer && axiomLayer) {
		return Layer.merge(sentryLayer, axiomLayer);
	}

	if (sentryLayer) {
		return sentryLayer;
	}

	if (axiomLayer) {
		return axiomLayer;
	}

	return Layer.empty;
};

export type { AxiomConfig } from "./axiom";
export type { SentryEffectConfig } from "./sentry-effect";
