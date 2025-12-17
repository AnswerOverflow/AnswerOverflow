import { v } from "convex/values";
import { components } from "../_generated/api";
import { adminQuery } from "../client";

export const lookupUserForImpersonation = adminQuery({
	args: {
		identifier: v.string(),
	},
	returns: v.union(
		v.object({
			userId: v.string(),
			name: v.string(),
			email: v.string(),
			image: v.union(v.string(), v.null()),
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		const { identifier } = args;
		const isEmail = identifier.includes("@");

		if (isEmail) {
			const userResult = await ctx.runQuery(
				components.betterAuth.adapter.findOne,
				{
					model: "user",
					where: [
						{
							field: "email",
							operator: "eq",
							value: identifier,
						},
					],
				},
			);

			if (
				!userResult ||
				typeof userResult !== "object" ||
				!("_id" in userResult)
			) {
				return null;
			}

			const userId = typeof userResult._id === "string" ? userResult._id : null;
			const name =
				"name" in userResult && typeof userResult.name === "string"
					? userResult.name
					: "Unknown";
			const email =
				"email" in userResult && typeof userResult.email === "string"
					? userResult.email
					: identifier;
			const image =
				"image" in userResult && typeof userResult.image === "string"
					? userResult.image
					: null;

			if (!userId) {
				return null;
			}

			return { userId, name, email, image };
		}

		const isNumeric = /^\d+$/.test(identifier);
		if (!isNumeric) {
			return null;
		}

		const accountResult = await ctx.runQuery(
			components.betterAuth.adapter.findOne,
			{
				model: "account",
				where: [
					{
						field: "providerId",
						operator: "eq",
						value: "discord",
					},
					{
						field: "accountId",
						operator: "eq",
						value: identifier,
					},
				],
			},
		);

		if (
			!accountResult ||
			typeof accountResult !== "object" ||
			!("userId" in accountResult) ||
			typeof accountResult.userId !== "string"
		) {
			return null;
		}

		const userResult = await ctx.runQuery(
			components.betterAuth.adapter.findOne,
			{
				model: "user",
				where: [
					{
						field: "_id",
						operator: "eq",
						value: accountResult.userId,
					},
				],
			},
		);

		if (
			!userResult ||
			typeof userResult !== "object" ||
			!("_id" in userResult)
		) {
			return null;
		}

		const userId = typeof userResult._id === "string" ? userResult._id : null;
		const name =
			"name" in userResult && typeof userResult.name === "string"
				? userResult.name
				: "Unknown";
		const email =
			"email" in userResult && typeof userResult.email === "string"
				? userResult.email
				: "unknown@example.com";
		const image =
			"image" in userResult && typeof userResult.image === "string"
				? userResult.image
				: null;

		if (!userId) {
			return null;
		}

		return { userId, name, email, image };
	},
});
