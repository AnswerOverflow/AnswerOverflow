import { zDiscordAccountUpsert } from './discordAccountSchemas';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { userServerSettings } from '../schema';

export const zUserServerSettingsFlags = z.object({
	canPubliclyDisplayMessages: z.boolean(),
	messageIndexingDisabled: z.boolean(),
});

const zUserServerSettingsSchema = createInsertSchema(userServerSettings)
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
export const zUserServerSettingsCreateWithDeps =
	zUserServerSettingsCreate.extend({
		user: zDiscordAccountUpsert,
	});

export const zUserServerSettingsUpdate = zUserServerSettingsMutable.merge(
	zUserServerSettingsFind,
);
