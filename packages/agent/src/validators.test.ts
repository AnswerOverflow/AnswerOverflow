import type { GenericId, Infer } from "convex/values";
import { expectTypeOf, test } from "vitest";
import type { ContextOptions, StorageOptions } from "./client/types";
import { vContextOptions, vMessageDoc, vStorageOptions } from "./validators";
import type { Doc } from "./component/_generated/dataModel";

expectTypeOf<Infer<typeof vContextOptions>>().toExtend<ContextOptions>();
expectTypeOf<ContextOptions>().toExtend<Infer<typeof vContextOptions>>();

expectTypeOf<Infer<typeof vStorageOptions>>().toExtend<StorageOptions>();
expectTypeOf<StorageOptions>().toExtend<Infer<typeof vStorageOptions>>();

type MessageBasedOnSchema = IdsToStrings<
	Omit<Doc<"messages">, "files" | "stepId" | "parentMessageId">
>;
expectTypeOf<Infer<typeof vMessageDoc>>().toEqualTypeOf<MessageBasedOnSchema>();
expectTypeOf<MessageBasedOnSchema>().toEqualTypeOf<Infer<typeof vMessageDoc>>();

test("noop", () => {});

type IdsToStrings<T> = T extends GenericId<string>
	? string
	: T extends (infer U)[]
		? IdsToStrings<U>[]
		: T extends ArrayBuffer
			? ArrayBuffer
			: T extends object
				? { [K in keyof T]: IdsToStrings<T[K]> }
				: T;
