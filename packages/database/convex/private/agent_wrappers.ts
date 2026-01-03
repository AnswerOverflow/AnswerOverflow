import {
	abortStreamArgs,
	addMessagesArgs,
	addStreamDeltaArgs,
	createStreamArgs,
	createThreadArgs,
	finalizeMessageArgs,
	finishStreamArgs,
	getMessageSearchFieldsArgs,
	getThreadArgs,
	listMessagesByThreadIdArgs,
	listStreamDeltasArgs,
	listStreamsArgs,
	searchMessagesArgs,
} from "@packages/agent/args";
import { components } from "../_generated/api";
import { privateAction, privateMutation, privateQuery } from "../client";

export const getThread = privateQuery({
	args: getThreadArgs,
	handler: async (ctx, args) => {
		return ctx.runQuery(components.agent.threads.getThread, args);
	},
});

export const createThread = privateMutation({
	args: createThreadArgs,
	handler: async (ctx, args) => {
		return ctx.runMutation(components.agent.threads.createThread, args);
	},
});

export const listMessagesByThreadId = privateQuery({
	args: listMessagesByThreadIdArgs,
	handler: async (ctx, args) => {
		return ctx.runQuery(components.agent.messages.listMessagesByThreadId, args);
	},
});

export const addMessages = privateMutation({
	args: addMessagesArgs,
	handler: async (ctx, args) => {
		return ctx.runMutation(components.agent.messages.addMessages, args);
	},
});

export const finalizeMessage = privateMutation({
	args: finalizeMessageArgs,
	handler: async (ctx, args) => {
		return ctx.runMutation(components.agent.messages.finalizeMessage, args);
	},
});

export const getMessageSearchFields = privateQuery({
	args: getMessageSearchFieldsArgs,
	handler: async (ctx, args) => {
		return ctx.runQuery(components.agent.messages.getMessageSearchFields, args);
	},
});

export const searchMessages = privateAction({
	args: searchMessagesArgs,
	handler: async (ctx, args) => {
		return ctx.runAction(components.agent.messages.searchMessages, args);
	},
});

export const createStream = privateMutation({
	args: createStreamArgs,
	handler: async (ctx, args) => {
		return ctx.runMutation(components.agent.streams.create, args);
	},
});

export const addStreamDelta = privateMutation({
	args: addStreamDeltaArgs,
	handler: async (ctx, args) => {
		return ctx.runMutation(components.agent.streams.addDelta, args);
	},
});

export const finishStream = privateMutation({
	args: finishStreamArgs,
	handler: async (ctx, args) => {
		return ctx.runMutation(components.agent.streams.finish, args);
	},
});

export const abortStream = privateMutation({
	args: abortStreamArgs,
	handler: async (ctx, args) => {
		return ctx.runMutation(components.agent.streams.abort, args);
	},
});

export const listStreams = privateQuery({
	args: listStreamsArgs,
	handler: async (ctx, args) => {
		return ctx.runQuery(components.agent.streams.list, args);
	},
});

export const listStreamDeltas = privateQuery({
	args: listStreamDeltasArgs,
	handler: async (ctx, args) => {
		return ctx.runQuery(components.agent.streams.listDeltas, args);
	},
});
