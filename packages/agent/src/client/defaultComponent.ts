import { componentsGeneric } from "convex/server";
import type { AgentComponent } from "./types";

export type CustomComponent = {
	/**
	 * If you have a custom name for the agent component, you can pass it here
	 * as components.myAgentName.
	 */
	component?: AgentComponent;
};

export function componentAPI(args?: CustomComponent): AgentComponent {
	return args?.component ?? defaultComponent;
}

export const defaultComponent = componentsGeneric()
	.agent as unknown as AgentComponent;
