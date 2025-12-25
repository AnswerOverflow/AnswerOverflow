import { v } from "convex/values";
import { customMutation } from "convex-helpers/server/customFunctions";
import { Schema } from "effect";
import { components } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../triggers";

function base64UrlEncode(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]!);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	return base64UrlEncode(hashBuffer);
}

const ApiKeyRecord = Schema.Struct({
	userId: Schema.String,
	enabled: Schema.optionalWith(Schema.NullOr(Schema.Boolean), {
		default: () => true,
	}),
	expiresAt: Schema.optionalWith(Schema.NullOr(Schema.Number), {
		default: () => null,
	}),
});

const AccountRecord = Schema.Struct({
	accountId: Schema.String,
});

async function verifyApiKey(ctx: MutationCtx, apiKey: string) {
	const hashedKey = await hashApiKey(apiKey);

	const record = await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: "apikey",
		where: [
			{
				field: "key",
				operator: "eq",
				value: hashedKey,
			},
		],
	});

	const parsed = Schema.decodeUnknownOption(ApiKeyRecord)(record);
	if (parsed._tag === "None") {
		throw new Error("Invalid API key");
	}

	const { userId, enabled, expiresAt } = parsed.value;

	if (enabled === false) {
		throw new Error("API key is disabled");
	}

	if (expiresAt && expiresAt < Date.now()) {
		throw new Error("API key has expired");
	}

	return { userId, enabled, expiresAt };
}

async function getDiscordAccountFromUserId(
	ctx: MutationCtx,
	userId: string,
): Promise<bigint> {
	const account = await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: "account",
		where: [
			{
				field: "userId",
				operator: "eq",
				value: userId,
			},
			{
				field: "providerId",
				operator: "eq",
				value: "discord",
			},
		],
	});

	const parsed = Schema.decodeUnknownOption(AccountRecord)(account);
	if (parsed._tag === "None") {
		throw new Error("Discord account not linked to this user");
	}

	return BigInt(parsed.value.accountId);
}

export const apiKeyMutation = customMutation(mutation, {
	args: {
		apiKey: v.string(),
	},
	input: async (ctx, args) => {
		const apiKeyRecord = await verifyApiKey(ctx, args.apiKey);
		const discordAccountId = await getDiscordAccountFromUserId(
			ctx,
			apiKeyRecord.userId,
		);

		return {
			ctx,
			args: {
				...args,
				discordAccountId,
				userId: apiKeyRecord.userId,
			},
		};
	},
});
