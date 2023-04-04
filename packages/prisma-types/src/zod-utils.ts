import { z } from 'zod';
import { toDict } from './bitfield';

export function toZObject<T extends readonly string[]>(...keys: T) {
	return z.object(toDict(() => z.boolean(), ...keys));
}

export const zUniqueArray = z
	.array(z.string())
	.transform((arr) => [...new Set(arr)]);
