import { serverSchema } from '../schema';
import { z } from 'zod';
import { toDict } from '../utils/bitfieldUtils';

export const serverSettingsFlags = [
	'readTheRulesConsentEnabled',
	'considerAllMessagesPublic',
	'anonymizeMessages',
] as const;

export function toZObject<T extends readonly string[]>(...keys: T) {
	return z.object(toDict(() => z.boolean(), ...keys));
}

export const zUniqueArray = z
	.array(z.string())
	.transform((arr) => [...new Set(arr)]);

export const zServerSettingsFlags = toZObject(...serverSettingsFlags);

export const zServerSchema = serverSchema.required().extend({
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

export type ServerWithFlags = Omit<z.infer<typeof zServerSchema>, 'bitfield'>;

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
