import type { HostConfig } from "react-reconciler";
import ReactReconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants.js";
import { raise } from "./helpers";
import { Node } from "./node";
import type { Renderer } from "./renderer";
import { TextNode } from "./text-node";

let currentUpdatePriority: number = DefaultEventPriority;

type HostContext = Record<string, never>;

const config: HostConfig<
	string,
	Record<string, unknown>,
	Renderer,
	Node<unknown>,
	TextNode,
	never,
	never,
	never,
	HostContext,
	true,
	never,
	number,
	number
> & {
	getCurrentUpdatePriority: () => number;
	setCurrentUpdatePriority: (priority: number) => void;
	resolveUpdatePriority: () => number;
	maySuspendCommit: (type: string, props: Record<string, unknown>) => boolean;
	preloadInstance: (type: string, props: Record<string, unknown>) => boolean;
	startSuspendingCommit: () => void;
	suspendInstance: (type: string, props: Record<string, unknown>) => void;
	waitForCommitToBeReady: () => null;
	NotPendingTransition: null;
	HostTransitionContext: { _currentValue: null; _currentValue2: null };
	resetFormInstance: (instance: Node<unknown>) => void;
	shouldAttemptEagerTransition: () => boolean;
} = {
	supportsMutation: true,
	supportsPersistence: false,
	supportsHydration: false,
	isPrimaryRenderer: true,
	scheduleTimeout: (fn: () => void, delay?: number) =>
		globalThis.setTimeout(fn, delay) as unknown as number,
	cancelTimeout: (id: number) =>
		globalThis.clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
	noTimeout: -1,

	getCurrentUpdatePriority: () => currentUpdatePriority,
	setCurrentUpdatePriority: (priority: number) => {
		currentUpdatePriority = priority;
	},
	resolveUpdatePriority: () => currentUpdatePriority || DefaultEventPriority,

	maySuspendCommit: () => false,
	preloadInstance: () => true,
	startSuspendingCommit: () => {},
	suspendInstance: () => {},
	waitForCommitToBeReady: () => null,
	NotPendingTransition: null,
	HostTransitionContext: { _currentValue: null, _currentValue2: null },
	resetFormInstance: () => {},
	shouldAttemptEagerTransition: () => false,

	getRootHostContext: () => ({}),
	getChildHostContext: (parentContext) => parentContext ?? {},

	createInstance: (
		type,
		props,
		_rootContainer,
		_hostContext,
		_internalHandle,
	) => {
		if (type !== "reacord-element") {
			raise(`Unknown element type: ${type}`);
		}

		if (typeof props.createNode !== "function") {
			raise("Missing createNode function");
		}

		const node: unknown = props.createNode(props.props);
		if (!(node instanceof Node)) {
			raise("createNode function did not return a Node");
		}

		return node;
	},
	createTextInstance: (text, _rootContainer, _hostContext, _internalHandle) =>
		new TextNode(text),
	shouldSetTextContent: () => false,
	detachDeletedInstance: () => {},
	beforeActiveInstanceBlur: () => {},
	afterActiveInstanceBlur: () => {},
	getInstanceFromNode: () => null,
	getInstanceFromScope: () => null,

	clearContainer: (renderer) => {
		renderer.nodes.clear();
	},
	appendChildToContainer: (renderer, child) => {
		renderer.nodes.add(child);
	},
	removeChildFromContainer: (renderer, child) => {
		renderer.nodes.remove(child);
	},
	insertInContainerBefore: (renderer, child, before) => {
		renderer.nodes.addBefore(child, before);
	},

	appendInitialChild: (parent, child) => {
		parent.children.add(child);
	},
	appendChild: (parent, child) => {
		parent.children.add(child);
	},
	removeChild: (parent, child) => {
		parent.children.remove(child);
	},
	insertBefore: (parent, child, before) => {
		parent.children.addBefore(child, before);
	},

	prepareUpdate: (_instance, _type, oldProps, newProps) => {
		return oldProps.props !== newProps.props ? true : null;
	},
	commitUpdate: (node, _payload, _type, _oldProps, newProps) => {
		if (newProps.props !== undefined) {
			node.props = newProps.props;
		}
	},
	commitTextUpdate: (node, _oldText, newText) => {
		node.props = newText;
	},

	prepareForCommit: () => null,
	resetAfterCommit: (renderer) => {
		renderer.render();
	},
	prepareScopeUpdate: () => {},

	preparePortalMount: () => raise("Portals are not supported"),
	getPublicInstance: () => raise("Refs are currently not supported"),

	finalizeInitialChildren: () => false,

	getCurrentEventPriority: () => DefaultEventPriority,
};

export const reconciler = ReactReconciler(config);
