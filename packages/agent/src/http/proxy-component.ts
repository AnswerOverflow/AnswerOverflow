import type { api } from "@packages/database/convex/_generated/api";

type WrapperApi = typeof api.private.agent_wrappers;

const COMPONENT_TO_WRAPPER_MAP: Record<string, keyof WrapperApi> = {
	"threads.getThread": "getThread",
	"threads.createThread": "createThread",
	"messages.listMessagesByThreadId": "listMessagesByThreadId",
	"messages.addMessages": "addMessages",
	"messages.finalizeMessage": "finalizeMessage",
	"messages.getMessageSearchFields": "getMessageSearchFields",
	"messages.searchMessages": "searchMessages",
	"streams.create": "createStream",
	"streams.addDelta": "addStreamDelta",
	"streams.finish": "finishStream",
	"streams.abort": "abortStream",
	"streams.list": "listStreams",
	"streams.listDeltas": "listStreamDeltas",
};

export function createProxyComponent(wrapperApi: WrapperApi) {
	const handler: ProxyHandler<{ __path__: string[] }> = {
		get(target, prop) {
			if (typeof prop !== "string") return undefined;

			const path = target.__path__ || [];
			const newPath = [...path, prop];
			const fullPath = newPath.join(".");

			const wrapperName = COMPONENT_TO_WRAPPER_MAP[fullPath];
			if (wrapperName) {
				return wrapperApi[wrapperName];
			}

			return new Proxy({ __path__: newPath }, handler);
		},
	};

	return new Proxy({ __path__: [] as string[] }, handler);
}
