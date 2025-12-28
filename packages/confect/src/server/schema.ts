import {
	defineSchema as defineConvexSchema,
	defineTable as defineConvexTable,
	type Expand,
	type GenericTableIndexes,
	type GenericTableSearchIndexes,
	type GenericTableVectorIndexes,
	type IdField,
	type IndexTiebreakerField,
	type SchemaDefinition,
	type SearchIndexConfig,
	type SystemFields,
	type SystemIndexes,
	type TableDefinition,
	type VectorIndexConfig,
} from "convex/server";
import type { Validator } from "convex/values";
import { pipe, Record, Schema } from "effect";

import {
	compileTableSchema,
	type TableSchemaToTableValidator,
} from "./schema-to-validator";
import {
	type ExtendWithSystemFields,
	extendWithSystemFields,
} from "./schemas/SystemFields";
import type { DeepMutable } from "./type-utils";

export const confectTableSchemas = {
	_scheduled_functions: Schema.Struct({
		name: Schema.String,
		args: Schema.Array(Schema.Any),
		scheduledTime: Schema.Number,
		completedTime: Schema.optional(Schema.Number),
		state: Schema.Union(
			Schema.Struct({ kind: Schema.Literal("pending") }),
			Schema.Struct({ kind: Schema.Literal("inProgress") }),
			Schema.Struct({ kind: Schema.Literal("success") }),
			Schema.Struct({
				kind: Schema.Literal("failed"),
				error: Schema.String,
			}),
			Schema.Struct({ kind: Schema.Literal("canceled") }),
		),
	}),
	_storage: Schema.Struct({
		sha256: Schema.String,
		size: Schema.Number,
		contentType: Schema.optional(Schema.String),
	}),
};

const tableSchemasFromConfectSchema = <
	ConfectSchema extends GenericConfectSchema,
>(
	confectSchema: ConfectSchema,
): TableSchemasFromConfectSchema<ConfectSchema> =>
	({
		...Record.map(confectSchema, ({ tableSchema }, tableName) => ({
			withSystemFields: extendWithSystemFields(tableName, tableSchema),
			withoutSystemFields: tableSchema,
		})),
		...Record.map(confectTableSchemas, (tableSchema, tableName) => ({
			withSystemFields: extendWithSystemFields(tableName, tableSchema),
			withoutSystemFields: tableSchema,
		})),
	}) as any;

/**
 * A Confect schema is a record of table definitions.
 */
export type GenericConfectSchema = Record<any, GenericConfectTableDefinition>;

/**
 * A Confect schema definition tracks the Confect schema, its Convex schema definition, and all of its table schemas.
 */
export type GenericConfectSchemaDefinition =
	ConfectSchemaDefinition<GenericConfectSchema>;

export interface ConfectSchemaDefinition<
	ConfectSchema extends GenericConfectSchema,
> {
	confectSchema: ConfectSchema;
	convexSchemaDefinition: SchemaDefinition<
		SchemaDefinitionFromConfectSchemaDefinition<ConfectSchema>,
		true
	>;
	tableSchemas: TableSchemasFromConfectSchema<ConfectSchema>;
}

class ConfectSchemaDefinitionImpl<ConfectSchema extends GenericConfectSchema>
	implements ConfectSchemaDefinition<ConfectSchema>
{
	confectSchema: ConfectSchema;
	convexSchemaDefinition: SchemaDefinition<
		SchemaDefinitionFromConfectSchemaDefinition<ConfectSchema>,
		true
	>;
	tableSchemas: TableSchemasFromConfectSchema<ConfectSchema>;

	constructor(confectSchema: ConfectSchema) {
		this.confectSchema = confectSchema;
		this.convexSchemaDefinition = pipe(
			confectSchema,
			Record.map(({ tableDefinition }) => tableDefinition),
			defineConvexSchema,
		) as SchemaDefinition<
			SchemaDefinitionFromConfectSchemaDefinition<ConfectSchema>,
			true
		>;
		this.tableSchemas = tableSchemasFromConfectSchema(confectSchema);
	}
}

type SchemaDefinitionFromConfectSchemaDefinition<
	ConfectSchema extends GenericConfectSchema,
> = Expand<{
	[TableName in keyof ConfectSchema &
		string]: ConfectSchema[TableName]["tableDefinition"];
}>;

/**
 * Define a Confect schema.
 */
export const defineSchema = <ConfectSchema extends GenericConfectSchema>(
	confectSchema: ConfectSchema,
): ConfectSchemaDefinition<ConfectSchema> =>
	new ConfectSchemaDefinitionImpl<ConfectSchema>(confectSchema);

export type GenericConfectTableDefinition = ConfectTableDefinition<
	any,
	any,
	any,
	any,
	any
>;

export interface ConfectTableDefinition<
	TableSchema extends Schema.Schema.AnyNoContext,
	TableValidator extends Validator<
		any,
		any,
		any
	> = TableSchemaToTableValidator<TableSchema>,
	Indexes extends GenericTableIndexes = {},
	SearchIndexes extends GenericTableSearchIndexes = {},
	VectorIndexes extends GenericTableVectorIndexes = {},
> {
	tableDefinition: TableDefinition<
		TableValidator,
		Indexes,
		SearchIndexes,
		VectorIndexes
	>;
	tableSchema: TableSchema;

	index<
		IndexName extends string,
		FirstFieldPath extends ExtractFieldPaths<TableValidator>,
		RestFieldPaths extends ExtractFieldPaths<TableValidator>[],
	>(
		name: IndexName,
		fields: [FirstFieldPath, ...RestFieldPaths],
	): ConfectTableDefinition<
		TableSchema,
		TableValidator,
		Expand<
			Indexes &
				Record<
					IndexName,
					[FirstFieldPath, ...RestFieldPaths, IndexTiebreakerField]
				>
		>,
		SearchIndexes,
		VectorIndexes
	>;
	searchIndex<
		IndexName extends string,
		SearchField extends ExtractFieldPaths<TableValidator>,
		FilterFields extends ExtractFieldPaths<TableValidator> = never,
	>(
		name: IndexName,
		indexConfig: Expand<SearchIndexConfig<SearchField, FilterFields>>,
	): ConfectTableDefinition<
		TableSchema,
		TableValidator,
		Indexes,
		Expand<
			SearchIndexes &
				Record<
					IndexName,
					{
						searchField: SearchField;
						filterFields: FilterFields;
					}
				>
		>,
		VectorIndexes
	>;
	vectorIndex<
		IndexName extends string,
		VectorField extends ExtractFieldPaths<TableValidator>,
		FilterFields extends ExtractFieldPaths<TableValidator> = never,
	>(
		name: IndexName,
		indexConfig: Expand<VectorIndexConfig<VectorField, FilterFields>>,
	): ConfectTableDefinition<
		TableSchema,
		TableValidator,
		Indexes,
		SearchIndexes,
		Expand<
			VectorIndexes &
				Record<
					IndexName,
					{
						vectorField: VectorField;
						dimensions: number;
						filterFields: FilterFields;
					}
				>
		>
	>;
}

export type ConfectSchemaFromConfectSchemaDefinition<
	ConfectSchemaDef extends GenericConfectSchemaDefinition,
> = ConfectSchemaDef extends ConfectSchemaDefinition<infer ConfectSchema>
	? ConfectSchema
	: never;

/**
 * @ignore
 */
export type ConfectDataModelFromConfectSchemaDefinition<
	ConfectSchemaDef extends GenericConfectSchemaDefinition,
> = ConfectSchemaDef extends ConfectSchemaDefinition<infer ConfectSchema>
	? ConfectDataModelFromConfectSchema<ConfectSchema>
	: never;

class ConfectTableDefinitionImpl<
	TableSchema extends Schema.Schema.AnyNoContext,
	TableValidator extends Validator<
		any,
		any,
		any
	> = TableSchemaToTableValidator<TableSchema>,
	Indexes extends GenericTableIndexes = {},
	SearchIndexes extends GenericTableSearchIndexes = {},
	VectorIndexes extends GenericTableVectorIndexes = {},
> implements
		ConfectTableDefinition<
			TableSchema,
			TableValidator,
			Indexes,
			SearchIndexes,
			VectorIndexes
		>
{
	tableSchema: TableSchema;
	tableDefinition: TableDefinition<
		TableValidator,
		Indexes,
		SearchIndexes,
		VectorIndexes
	>;

	constructor(tableSchema: TableSchema, tableValidator: TableValidator) {
		this.tableSchema = tableSchema;
		this.tableDefinition = defineConvexTable(tableValidator);
	}

	index<
		IndexName extends string,
		FirstFieldPath extends ExtractFieldPaths<TableValidator>,
		RestFieldPaths extends ExtractFieldPaths<TableValidator>[],
	>(
		name: IndexName,
		fields: [FirstFieldPath, ...RestFieldPaths],
	): ConfectTableDefinition<
		TableSchema,
		TableValidator,
		Expand<
			Indexes &
				Record<
					IndexName,
					[FirstFieldPath, ...RestFieldPaths, IndexTiebreakerField]
				>
		>,
		SearchIndexes,
		VectorIndexes
	> {
		this.tableDefinition = this.tableDefinition.index(name, fields);

		return this;
	}

	searchIndex<
		IndexName extends string,
		SearchField extends ExtractFieldPaths<TableValidator>,
		FilterFields extends ExtractFieldPaths<TableValidator> = never,
	>(
		name: IndexName,
		indexConfig: Expand<SearchIndexConfig<SearchField, FilterFields>>,
	): ConfectTableDefinition<
		TableSchema,
		TableValidator,
		Indexes,
		Expand<
			SearchIndexes &
				Record<
					IndexName,
					{
						searchField: SearchField;
						filterFields: FilterFields;
					}
				>
		>,
		VectorIndexes
	> {
		this.tableDefinition = this.tableDefinition.searchIndex(name, indexConfig);

		return this;
	}

	vectorIndex<
		IndexName extends string,
		VectorField extends ExtractFieldPaths<TableValidator>,
		FilterFields extends ExtractFieldPaths<TableValidator> = never,
	>(
		name: IndexName,
		indexConfig: {
			vectorField: VectorField;
			dimensions: number;
			filterFields?: FilterFields[] | undefined;
		},
	): ConfectTableDefinition<
		TableSchema,
		TableValidator,
		Indexes,
		SearchIndexes,
		Expand<
			VectorIndexes &
				Record<
					IndexName,
					{
						vectorField: VectorField;
						dimensions: number;
						filterFields: FilterFields;
					}
				>
		>
	> {
		this.tableDefinition = this.tableDefinition.vectorIndex(name, indexConfig);

		return this;
	}
}

/**
 * Define a Confect table.
 */
export const defineTable = <TableSchema extends Schema.Schema.AnyNoContext>(
	tableSchema: TableSchema,
): ConfectTableDefinition<TableSchema> => {
	const tableValidator = compileTableSchema(tableSchema);
	return new ConfectTableDefinitionImpl(
		tableSchema,
		tableValidator,
	) as ConfectTableDefinition<TableSchema>;
};

export type TableNamesInConfectSchema<
	ConfectSchema extends GenericConfectSchema,
> = keyof ConfectSchema & string;

export type TableNamesInConfectSchemaDefinition<
	ConfectSchemaDefinition extends GenericConfectSchemaDefinition,
> = TableNamesInConfectSchema<ConfectSchemaDefinition["confectSchema"]>;

/**
 * Produce a Confect data model from a Confect schema.
 */
export type ConfectDataModelFromConfectSchema<
	ConfectSchema extends GenericConfectSchema,
> = {
	[TableName in keyof ConfectSchema &
		string]: ConfectSchema[TableName] extends ConfectTableDefinition<
		infer TableSchema,
		infer _TableValidator,
		infer Indexes,
		infer SearchIndexes,
		infer VectorIndexes
	>
		? TableSchema extends Schema.Schema<any, any>
			? {
					confectDocument: ExtractConfectDocument<TableName, TableSchema>;
					// It's pretty hard to recursively make an arbitrary TS type readonly/mutable, so we capture both the readonly version of the `convexDocument` (which is the `encodedConfectDocument`) and the mutable version (`convexDocument`).
					encodedConfectDocument: ExtractEncodedConfectDocument<
						TableName,
						TableSchema
					>;
					convexDocument: ExtractMutableDocument<TableName, TableSchema>;
					fieldPaths:
						| keyof IdField<TableName>
						| ExtractFieldPathsFromSchema<TableSchema>;
					indexes: Expand<Indexes & SystemIndexes>;
					searchIndexes: SearchIndexes;
					vectorIndexes: VectorIndexes;
				}
			: never
		: never;
};

type ExtractConfectDocument<
	TableName extends string,
	S extends Schema.Schema<any, any>,
> = Expand<Readonly<IdField<TableName>> & Readonly<SystemFields> & S["Type"]>;

type ExtractEncodedConfectDocument<
	TableName extends string,
	S extends Schema.Schema<any, any>,
> = Expand<
	Readonly<IdField<TableName>> & Readonly<SystemFields> & S["Encoded"]
>;

type ExtractMutableDocument<
	TableName extends string,
	S extends Schema.Schema<any, any>,
> = Expand<IdField<TableName> & SystemFields & DeepMutable<S["Encoded"]>>;

export const confectSystemSchema = {
	_scheduled_functions: defineTable(confectTableSchemas._scheduled_functions),
	_storage: defineTable(confectTableSchemas._storage),
};

export const confectSystemSchemaDefinition = defineSchema(confectSystemSchema);

type ConfectSystemSchema = typeof confectSystemSchemaDefinition;

export type ConfectSystemDataModel =
	ConfectDataModelFromConfectSchemaDefinition<ConfectSystemSchema>;

type TableSchemasFromConfectSchema<ConfectSchema extends GenericConfectSchema> =
	Expand<
		{
			[TableName in keyof ConfectSchema & string]: {
				withSystemFields: ExtendWithSystemFields<
					TableName,
					ConfectSchema[TableName]["tableSchema"]
				>;
				withoutSystemFields: ConfectSchema[TableName]["tableSchema"];
			};
		} & {
			[TableName in keyof ConfectSystemSchema["confectSchema"]]: {
				withSystemFields: ExtendWithSystemFields<
					TableName,
					ConfectSystemSchema["confectSchema"][TableName]["tableSchema"]
				>;
				withoutSystemFields: ConfectSystemSchema["confectSchema"][TableName]["tableSchema"];
			};
		}
	>;

// Vendored types from convex-js, partially modified. Ideally we could use these directly. See https://github.com/get-convex/convex-js/pull/14

/**
 * Extract field paths directly from a value type (Schema.Encoded).
 * This is more robust than going through validator conversion.
 */
type ExtractFieldPathsFromEncodedValue<
	T,
	Prefix extends string = "",
	Depth extends number = 0,
> = Depth extends 3
	? never
	: T extends Record<string, unknown>
		? {
				[K in keyof T & string]:
					| (Prefix extends "" ? K : `${Prefix}.${K}`)
					| ExtractFieldPathsFromEncodedValue<
							NonNullable<T[K]>,
							Prefix extends "" ? K : `${Prefix}.${K}`,
							[1, 2, 3, 4][Depth]
					  >;
			}[keyof T & string]
		: never;

/**
 * Extract all of the index field paths within a {@link Validator}.
 *
 * This is used within {@link defineConvexTable}.
 * @public
 */
type ExtractFieldPaths<T extends Validator<any, any, any>> =
	// Add in the system fields available in index definitions.
	// This should be everything except for `_id` because thats added to indexes
	// automatically.
	T["fieldPaths"] | keyof SystemFields;

/**
 * Extract field paths from a Schema, bypassing validator conversion.
 * Use this when the schema is too complex for ValueToValidator.
 */
export type ExtractFieldPathsFromSchema<S extends Schema.Schema<any, any>> =
	| ExtractFieldPathsFromEncodedValue<S["Encoded"]>
	| keyof SystemFields;

/**
 * Extract the {@link GenericDocument} within a {@link Validator} and
 * add on the system fields.
 *
 * This is used within {@link defineConvexTable}.
 * @public
 */
type ExtractDocument<
	TableName extends string,
	T extends Validator<any, any, any>,
> = Expand<IdField<TableName> & SystemFields & T["type"]>; //the table name) and trick TypeScript into expanding them. // Add the system fields to `Value` (except `_id` because it depends on
