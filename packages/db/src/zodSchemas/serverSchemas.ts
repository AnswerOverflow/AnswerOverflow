import { toZObject } from '@answeroverflow/prisma-types';
import { createInsertSchema } from 'drizzle-zod';
import { servers } from '../schema';
import { z } from 'zod';

export const serverSettingsFlags = [
	'readTheRulesConsentEnabled',
	'considerAllMessagesPublic',
	'anonymizeMessages',
] as const;

export const zServerSettingsFlags = toZObject(...serverSettingsFlags);

export const zServerSchema = createInsertSchema(servers).required().extend({
	flags: zServerSettingsFlags,
});

export const zServerMutable = zServerSchema
	.omit({
		id: true,
	})
	.deepPartial();

export const zServerRequired = zServerSchema.pick({
	id: true,
	name: true,
});

export const zServerCreate = z.object({
	...zServerMutable.shape,
	...zServerRequired.shape,
});

export const zServerUpdate = z.object({
	...zServerMutable.shape,
	id: zServerSchema.shape.id,
});

export const zServerUpsert = z.object({
	create: zServerCreate,
	update: zServerMutable.optional(),
});

export type ServerWithFlags = z.infer<typeof zServerSchema>;

export const zServerPublic = zServerSchema.pick({
	id: true,
	name: true,
	icon: true,
	vanityUrl: true,
	vanityInviteCode: true,
	description: true,
	kickedTime: true,
	customDomain: true,
});

export type ServerPublicWithFlags = z.infer<typeof zServerPublic>;
