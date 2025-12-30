import { omit } from "convex-helpers";
import { literals } from "convex-helpers/validators";
import {
	defineTable,
	type GenericTableSearchIndexes,
	type SchemaDefinition,
	type TableDefinition,
} from "convex/server";
import {
	type GenericId,
	type Infer,
	type ObjectType,
	v,
	type VId,
	type VObject,
	type VUnion,
} from "convex/values";
import type { QueryCtx } from "../_generated/server";

// We only generate embeddings for non-tool, non-system messages
const embeddings = {
	model: v.string(),
	// What table it's stored in. (usually messages or memories)
	table: v.string(),
	userId: v.optional(v.string()),
	threadId: v.optional(v.string()),
	// not set for private threads
	model_table_userId: v.optional(v.array(v.string())),
	model_table_threadId: v.optional(v.array(v.string())),
	vector: v.array(v.number()),
};

export const vEmbeddingsWithoutDenormalizedFields = v.object(
	omit(embeddings, ["model_table_userId", "model_table_threadId"]),
);
export type EmbeddingsWithoutDenormalizedFields = Infer<
	typeof vEmbeddingsWithoutDenormalizedFields
>;

function table<D extends number>(dimensions: D): VectorTable<D> {
	return defineTable(embeddings)
		.vectorIndex("vector", {
			vectorField: "vector",
			dimensions,
			filterFields: ["model_table_userId", "model_table_threadId"],
		})
		.index("model_table_threadId", ["model", "table", "threadId"]);
}

type VectorTable<D extends number> = TableDefinition<
	VObject<ObjectType<typeof embeddings>, typeof embeddings>,
	{ model_table_threadId: ["model", "table", "threadId", "_creationTime"] },
	GenericTableSearchIndexes,
	VectorIndex<D>
>;

type VectorIndex<D extends number> = {
	vector: {
		vectorField: "vector";
		dimensions: D;
		filterFields: "model_table_userId" | "model_table_threadId";
	};
};

export type VectorSchema = SchemaDefinition<
	{ [key in VectorTableName]: VectorTable<128> },
	true
>;

export const VectorDimensions = [
	128, 256, 512, 768, 1024, 1408, 1536, 2048, 3072, 4096,
] as const;
export function validateVectorDimension(
	dimension: number,
): asserts dimension is VectorDimension {
	if (!VectorDimensions.includes(dimension as VectorDimension)) {
		throw new Error(
			`Unsupported vector dimension${dimension}. Supported: ${VectorDimensions.join(", ")}`,
		);
	}
}
export type VectorDimension = (typeof VectorDimensions)[number];
export const VectorTableNames = VectorDimensions.map(
	(d) => `embeddings_${d}`,
) as `embeddings_${(typeof VectorDimensions)[number]}`[];
export type VectorTableName = (typeof VectorTableNames)[number];
export type VectorTableId = GenericId<(typeof VectorTableNames)[number]>;

export const vVectorDimension = literals(...VectorDimensions);
export const vVectorTableName = literals(...VectorTableNames);
export const vVectorId = v.union(
	...VectorTableNames.map((name) => v.id(name)),
) as VUnion<
	GenericId<(typeof VectorTableNames)[number]>,
	VId<(typeof VectorTableNames)[number]>[]
>;

export function getVectorTableName(dimension: VectorDimension) {
	return `embeddings_${dimension}` as VectorTableName;
}
export function getVectorIdInfo(ctx: QueryCtx, id: VectorTableId) {
	for (const dimension of VectorDimensions) {
		const tableName = getVectorTableName(dimension);
		if (ctx.db.normalizeId(tableName, id)) {
			return { tableName, dimension };
		}
	}
	throw new Error(`Unknown vector table id: ${id}`);
}

const tables: {
	[K in keyof typeof VectorDimensions &
		number as `embeddings_${(typeof VectorDimensions)[K]}`]: VectorTable<
		(typeof VectorDimensions)[K]
	>;
} = Object.fromEntries(
	VectorDimensions.map((dimensions) => [
		`embeddings_${dimensions}`,
		table(dimensions),
	]),
) as Record<
	`embeddings_${(typeof VectorDimensions)[number]}`,
	VectorTable<(typeof VectorDimensions)[number]>
>;

export default tables;
