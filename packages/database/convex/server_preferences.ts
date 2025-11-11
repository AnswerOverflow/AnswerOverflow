import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { publicInternalMutation, publicInternalQuery } from "./publicInternal";
import { assertCanEditServer, getDiscordAccountIdFromAuth } from "./auth";

const serverPreferencesSchema = v.object({
	serverId: v.id("servers"),
	readTheRulesConsentEnabled: v.optional(v.boolean()),
	considerAllMessagesPublicEnabled: v.optional(v.boolean()),
	anonymizeMessagesEnabled: v.optional(v.boolean()),
	customDomain: v.optional(v.string()),
	subpath: v.optional(v.string()),
});

export const getServerPreferencesByServerId = publicInternalQuery({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const preferences = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.first();

		return preferences ?? null;
	},
});

export const createServerPreferences = publicInternalMutation({
	args: {
		preferences: serverPreferencesSchema,
	},
	handler: async (ctx, args) => {
		// Check authentication and authorization
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);

		// Get server to get Discord ID
		const server = await ctx.db.get(args.preferences.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		// Check if user can edit this server
		await assertCanEditServer(ctx, server.discordId, discordAccountId);

		// Check if preferences already exist
		const existing = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) =>
				q.eq("serverId", args.preferences.serverId),
			)
			.first();

		if (existing) {
			throw new Error("Server preferences already exist");
		}

		// Validate custom domain uniqueness if provided
		if (args.preferences.customDomain) {
			const allServers = await ctx.db.query("servers").collect();
			for (const s of allServers) {
				if (s.preferencesId) {
					const prefs = await ctx.db.get(s.preferencesId);
					if (
						prefs?.customDomain === args.preferences.customDomain &&
						s._id !== args.preferences.serverId
					) {
						throw new Error(
							`Server with custom domain ${args.preferences.customDomain} already exists`,
						);
					}
				}
			}
		}

		const preferencesId = await ctx.db.insert(
			"serverPreferences",
			args.preferences,
		);

		// Update server to reference preferences
		const serverRecord = await ctx.db.get(args.preferences.serverId);
		if (serverRecord) {
			await ctx.db.patch(serverRecord._id, {
				preferencesId,
			});
		}

		const created = await ctx.db.get(preferencesId);
		if (!created) {
			throw new Error("Failed to create server preferences");
		}

		return created;
	},
});

export const updateServerPreferences = publicInternalMutation({
	args: {
		preferences: serverPreferencesSchema,
	},
	handler: async (ctx, args) => {
		// Check authentication and authorization
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);

		// Get server to get Discord ID
		const server = await ctx.db.get(args.preferences.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		// Check if user can edit this server
		await assertCanEditServer(ctx, server.discordId, discordAccountId);

		const existing = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) =>
				q.eq("serverId", args.preferences.serverId),
			)
			.first();

		if (!existing) {
			throw new Error("Server preferences not found");
		}

		// Validate custom domain uniqueness if being changed
		if (
			args.preferences.customDomain &&
			args.preferences.customDomain !== existing.customDomain
		) {
			const allServers = await ctx.db.query("servers").collect();
			for (const s of allServers) {
				if (s.preferencesId && s.preferencesId !== existing._id) {
					const prefs = await ctx.db.get(s.preferencesId);
					if (prefs?.customDomain === args.preferences.customDomain) {
						throw new Error(
							`Server with custom domain ${args.preferences.customDomain} already exists`,
						);
					}
				}
			}
		}

		await ctx.db.patch(existing._id, args.preferences);

		const updated = await ctx.db.get(existing._id);
		if (!updated) {
			throw new Error("Failed to update server preferences");
		}

		return updated;
	},
});

export const upsertServerPreferences = publicInternalMutation({
	args: {
		preferences: serverPreferencesSchema,
	},
	handler: async (ctx, args) => {
		// Check authentication and authorization
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);

		// Get server to get Discord ID
		const server = await ctx.db.get(args.preferences.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		// Check if user can edit this server
		await assertCanEditServer(ctx, server.discordId, discordAccountId);

		const existing = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) =>
				q.eq("serverId", args.preferences.serverId),
			)
			.first();

		if (existing) {
			// Update existing
			// Validate custom domain uniqueness if being changed
			if (
				args.preferences.customDomain &&
				args.preferences.customDomain !== existing.customDomain
			) {
				const allServers = await ctx.db.query("servers").collect();
				for (const s of allServers) {
					if (s.preferencesId && s.preferencesId !== existing._id) {
						const prefs = await ctx.db.get(s.preferencesId);
						if (prefs?.customDomain === args.preferences.customDomain) {
							throw new Error(
								`Server with custom domain ${args.preferences.customDomain} already exists`,
							);
						}
					}
				}
			}

			await ctx.db.patch(existing._id, args.preferences);
			const updated = await ctx.db.get(existing._id);
			if (!updated) {
				throw new Error("Failed to update server preferences");
			}
			return updated;
		} else {
			// Create new
			// Validate custom domain uniqueness if provided
			if (args.preferences.customDomain) {
				const allServers = await ctx.db.query("servers").collect();
				for (const s of allServers) {
					if (s.preferencesId) {
						const prefs = await ctx.db.get(s.preferencesId);
						if (prefs?.customDomain === args.preferences.customDomain) {
							throw new Error(
								`Server with custom domain ${args.preferences.customDomain} already exists`,
							);
						}
					}
				}
			}

			const preferencesId = await ctx.db.insert(
				"serverPreferences",
				args.preferences,
			);

			// Update server to reference preferences
			const serverRecord = await ctx.db.get(args.preferences.serverId);
			if (serverRecord) {
				await ctx.db.patch(serverRecord._id, {
					preferencesId,
				});
			}

			const created = await ctx.db.get(preferencesId);
			if (!created) {
				throw new Error("Failed to create server preferences");
			}
			return created;
		}
	},
});

export const deleteServerPreferences = publicInternalMutation({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		// Check authentication and authorization
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);

		// Get server to get Discord ID
		const server = await ctx.db.get(args.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		// Check if user can edit this server
		await assertCanEditServer(ctx, server.discordId, discordAccountId);

		const preferences = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.first();

		if (preferences) {
			// Remove reference from server
			const serverRecord = await ctx.db.get(args.serverId);
			if (serverRecord) {
				await ctx.db.patch(serverRecord._id, {
					preferencesId: undefined,
				});
			}

			// Delete preferences
			await ctx.db.delete(preferences._id);
		}

		return null;
	},
});

// Internal mutations for testing (bypass authentication)
export const createServerPreferencesInternal = internalMutation({
	args: {
		preferences: serverPreferencesSchema,
	},
	handler: async (ctx, args) => {
		// Get server to get Discord ID
		const server = await ctx.db.get(args.preferences.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		// Check if preferences already exist
		const existing = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) =>
				q.eq("serverId", args.preferences.serverId),
			)
			.first();

		if (existing) {
			throw new Error("Server preferences already exist");
		}

		// Validate custom domain uniqueness if provided
		if (args.preferences.customDomain) {
			const allServers = await ctx.db.query("servers").collect();
			for (const s of allServers) {
				if (s.preferencesId) {
					const prefs = await ctx.db.get(s.preferencesId);
					if (
						prefs?.customDomain === args.preferences.customDomain &&
						s._id !== args.preferences.serverId
					) {
						throw new Error(
							`Server with custom domain ${args.preferences.customDomain} already exists`,
						);
					}
				}
			}
		}

		const preferencesId = await ctx.db.insert(
			"serverPreferences",
			args.preferences,
		);

		// Update server to reference preferences
		const serverRecord = await ctx.db.get(args.preferences.serverId);
		if (serverRecord) {
			await ctx.db.patch(serverRecord._id, {
				preferencesId,
			});
		}

		const created = await ctx.db.get(preferencesId);
		if (!created) {
			throw new Error("Failed to create server preferences");
		}

		return created;
	},
});

export const updateServerPreferencesInternal = internalMutation({
	args: {
		preferences: serverPreferencesSchema,
	},
	handler: async (ctx, args) => {
		// Get server to get Discord ID
		const server = await ctx.db.get(args.preferences.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		const existing = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) =>
				q.eq("serverId", args.preferences.serverId),
			)
			.first();

		if (!existing) {
			throw new Error("Server preferences not found");
		}

		// Validate custom domain uniqueness if being changed
		if (
			args.preferences.customDomain &&
			args.preferences.customDomain !== existing.customDomain
		) {
			const allServers = await ctx.db.query("servers").collect();
			for (const s of allServers) {
				if (s.preferencesId && s.preferencesId !== existing._id) {
					const prefs = await ctx.db.get(s.preferencesId);
					if (prefs?.customDomain === args.preferences.customDomain) {
						throw new Error(
							`Server with custom domain ${args.preferences.customDomain} already exists`,
						);
					}
				}
			}
		}

		await ctx.db.patch(existing._id, args.preferences);

		const updated = await ctx.db.get(existing._id);
		if (!updated) {
			throw new Error("Failed to update server preferences");
		}

		return updated;
	},
});

export const upsertServerPreferencesInternal = internalMutation({
	args: {
		preferences: serverPreferencesSchema,
	},
	handler: async (ctx, args) => {
		// Get server to get Discord ID
		const server = await ctx.db.get(args.preferences.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		const existing = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) =>
				q.eq("serverId", args.preferences.serverId),
			)
			.first();

		if (existing) {
			// Update existing
			// Validate custom domain uniqueness if being changed
			if (
				args.preferences.customDomain &&
				args.preferences.customDomain !== existing.customDomain
			) {
				const allServers = await ctx.db.query("servers").collect();
				for (const s of allServers) {
					if (s.preferencesId && s.preferencesId !== existing._id) {
						const prefs = await ctx.db.get(s.preferencesId);
						if (prefs?.customDomain === args.preferences.customDomain) {
							throw new Error(
								`Server with custom domain ${args.preferences.customDomain} already exists`,
							);
						}
					}
				}
			}

			await ctx.db.patch(existing._id, args.preferences);
			const updated = await ctx.db.get(existing._id);
			if (!updated) {
				throw new Error("Failed to update server preferences");
			}
			return updated;
		} else {
			// Create new
			// Validate custom domain uniqueness if provided
			if (args.preferences.customDomain) {
				const allServers = await ctx.db.query("servers").collect();
				for (const s of allServers) {
					if (s.preferencesId) {
						const prefs = await ctx.db.get(s.preferencesId);
						if (prefs?.customDomain === args.preferences.customDomain) {
							throw new Error(
								`Server with custom domain ${args.preferences.customDomain} already exists`,
							);
						}
					}
				}
			}

			const preferencesId = await ctx.db.insert(
				"serverPreferences",
				args.preferences,
			);

			// Update server to reference preferences
			const serverRecord = await ctx.db.get(args.preferences.serverId);
			if (serverRecord) {
				await ctx.db.patch(serverRecord._id, {
					preferencesId,
				});
			}

			const created = await ctx.db.get(preferencesId);
			if (!created) {
				throw new Error("Failed to create server preferences");
			}
			return created;
		}
	},
});

export const deleteServerPreferencesInternal = internalMutation({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const preferences = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.first();

		if (preferences) {
			// Remove reference from server
			const serverRecord = await ctx.db.get(args.serverId);
			if (serverRecord) {
				await ctx.db.patch(serverRecord._id, {
					preferencesId: undefined,
				});
			}

			// Delete preferences
			await ctx.db.delete(preferences._id);
		}

		return null;
	},
});
