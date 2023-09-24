import { z } from 'zod';
import { discordAccountSchema } from '../schema';

const zDiscordAccount = discordAccountSchema.required();

export const zDiscordAccountPublic = zDiscordAccount.pick({
	id: true,
	name: true,
	avatar: true,
});

export const zDiscordAccountRequired = zDiscordAccount.pick({
	id: true,
	name: true,
});

export const zDiscordAccountMutable = zDiscordAccount
	.omit({
		id: true,
	})
	.deepPartial();

export const zDiscordAccountCreate = zDiscordAccountMutable.merge(
	zDiscordAccountRequired,
);

export const zDiscordAccountUpdate = zDiscordAccountMutable.extend({
	id: zDiscordAccount.shape.id,
});
export const zDiscordAccountUpsert = zDiscordAccountCreate;
export type DiscordAccountPublic = z.infer<typeof zDiscordAccountPublic>;
