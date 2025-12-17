import type { GenericValidator, VObject } from "convex/values";

type AnyVObject = VObject<
	Record<string, unknown>,
	Record<string, GenericValidator>,
	"required"
>;

export function pick<T extends AnyVObject, K extends keyof T["fields"]>(
	schema: T,
	keys: readonly K[],
): { [P in K]: T["fields"][P] } {
	const result: Record<string, GenericValidator> = {};
	for (const key of keys) {
		const field = schema.fields[key as string];
		if (field) {
			result[key as string] = field;
		}
	}
	return result as { [P in K]: T["fields"][P] };
}

export function omit<T extends AnyVObject, K extends keyof T["fields"]>(
	schema: T,
	keys: readonly K[],
): Omit<T["fields"], K> {
	const keysSet = new Set<string>(keys as readonly string[]);
	const result: Record<string, GenericValidator> = {};
	for (const [key, value] of Object.entries(schema.fields)) {
		if (!keysSet.has(key)) {
			result[key] = value;
		}
	}
	return result as Omit<T["fields"], K>;
}
