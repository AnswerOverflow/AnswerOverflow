import { zDiscordAccountUpsert } from './discordAccountSchemas';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { dbUserServerSettings } from '../schema';

export const zUserServerSettingsFlags = z.object({
	canPubliclyDisplayMessages: z.boolean(),
	messageIndexingDisabled: z.boolean(),
});

export const userServerSettingsValues = {
	canPubliclyDisplayMessages: 1 << 0,
	messageIndexingDisabled: 1 << 1,
};

const zUserServerSettingsSchema = createInsertSchema(dbUserServerSettings)
	.required()
	.extend({
		flags: zUserServerSettingsFlags,
	});

const zUserServerSettingsRequired = zUserServerSettingsSchema.pick({
	serverId: true,
	userId: true,
});

export const zUserServerSettingsMutable = zUserServerSettingsSchema
	.omit({
		serverId: true,
		userId: true,
	})
	.deepPartial();

export const zUserServerSettingsFind = zUserServerSettingsSchema.pick({
	userId: true,
	serverId: true,
});

export const zUserServerSettingsCreate = zUserServerSettingsMutable.merge(
	zUserServerSettingsRequired,
);
export const zUserServerSettingsCreateWithDeps = z.object({
	...zUserServerSettingsCreate.omit({
		userId: true,
	}).shape,
	user: zDiscordAccountUpsert,
});

export const zUserServerSettingsUpdate = zUserServerSettingsMutable.merge(
	zUserServerSettingsFind,
);
