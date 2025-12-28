import { Schema } from "effect";
import { Id } from "../schemas/Id";

/**
 * Produces a schema for Convex system fields.
 */
export const SystemFields = <TableName extends string>(tableName: TableName) =>
	Schema.Struct({
		_id: Id(tableName),
		_creationTime: Schema.Number,
	});

/**
 * Extend a table schema with Convex system fields.
 */
export const extendWithSystemFields = <
	TableName extends string,
	TableSchema extends Schema.Schema.AnyNoContext,
>(
	tableName: TableName,
	schema: TableSchema,
): ExtendWithSystemFields<TableName, TableSchema> =>
	Schema.extend(schema, SystemFields(tableName));

/**
 * Extend a table schema with Convex system fields at the type level.
 */
export type ExtendWithSystemFields<
	TableName extends string,
	TableSchema extends Schema.Schema.AnyNoContext,
> = Schema.extend<TableSchema, ReturnType<typeof SystemFields<TableName>>>;
