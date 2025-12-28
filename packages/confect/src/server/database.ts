import type {
	BetterOmit,
	DocumentByInfo,
	DocumentByName,
	Expand,
	Expression,
	FilterBuilder,
	GenericDatabaseReader,
	GenericDatabaseWriter,
	GenericDataModel,
	Indexes,
	IndexRange,
	IndexRangeBuilder,
	NamedIndex,
	NamedSearchIndex,
	OrderedQuery,
	PaginationOptions,
	PaginationResult,
	Query,
	QueryInitializer,
	SearchFilter,
	SearchFilterBuilder,
	SearchIndexes,
	WithOptionalSystemFields,
	WithoutSystemFields,
} from "convex/server";
import type { GenericId } from "convex/values";
import {
	Array,
	type Cause,
	Chunk,
	Data,
	Effect,
	identity,
	Option,
	type ParseResult,
	pipe,
	Record,
	Schema,
	Stream,
} from "effect";

import type {
	ConfectDocumentByName,
	DataModelFromConfectDataModel,
	GenericConfectDataModel,
	GenericConfectDocument,
	GenericConfectTableInfo,
	GenericEncodedConfectDocument,
	TableInfoFromConfectTableInfo,
	TableNamesInConfectDataModel,
} from "./data-model";
import {
	type ConfectDataModelFromConfectSchema,
	type ConfectSystemDataModel,
	confectSystemSchemaDefinition,
	type GenericConfectSchema,
} from "./schema";
import { extendWithSystemFields } from "./schemas/SystemFields";

interface ConfectQuery<
	ConfectTableInfo extends GenericConfectTableInfo,
	TableName extends string,
> {
	filter(
		predicate: (
			q: FilterBuilder<TableInfoFromConfectTableInfo<ConfectTableInfo>>,
		) => Expression<boolean>,
	): ConfectQuery<ConfectTableInfo, TableName>;
	order(
		order: "asc" | "desc",
	): ConfectOrderedQuery<ConfectTableInfo, TableName>;
	paginate(
		paginationOpts: PaginationOptions,
	): Effect.Effect<PaginationResult<ConfectTableInfo["confectDocument"]>>;
	collect(): Effect.Effect<ConfectTableInfo["confectDocument"][]>;
	take(n: number): Effect.Effect<ConfectTableInfo["confectDocument"][]>;
	first(): Effect.Effect<Option.Option<ConfectTableInfo["confectDocument"]>>;
	unique(): Effect.Effect<
		Option.Option<ConfectTableInfo["confectDocument"]>,
		NotUniqueError
	>;
	stream(): Stream.Stream<ConfectTableInfo["confectDocument"]>;
}

interface ConfectOrderedQuery<
	ConfectTableInfo extends GenericConfectTableInfo,
	TableName extends string,
> extends Omit<ConfectQuery<ConfectTableInfo, TableName>, "order"> {}

export class NotUniqueError extends Data.TaggedError("NotUniqueError") {}

class ConfectQueryImpl<
	ConfectTableInfo extends GenericConfectTableInfo,
	TableName extends string,
> implements ConfectQuery<ConfectTableInfo, TableName>
{
	q: Query<TableInfoFromConfectTableInfo<ConfectTableInfo>>;
	tableSchema: Schema.Schema<
		ConfectTableInfo["confectDocument"],
		ConfectTableInfo["encodedConfectDocument"]
	>;
	tableName: TableName;
	constructor(
		q:
			| Query<TableInfoFromConfectTableInfo<ConfectTableInfo>>
			| OrderedQuery<TableInfoFromConfectTableInfo<ConfectTableInfo>>,
		tableSchema: Schema.Schema<
			ConfectTableInfo["confectDocument"],
			ConfectTableInfo["encodedConfectDocument"]
		>,
		tableName: TableName,
	) {
		// This is some trickery, copied from convex-js. I suspect there's a better way.
		this.q = q as Query<TableInfoFromConfectTableInfo<ConfectTableInfo>>;
		this.tableSchema = tableSchema;
		this.tableName = tableName;
	}
	decode(
		convexDocument: ConfectTableInfo["encodedConfectDocument"],
	): ConfectTableInfo["confectDocument"] {
		return decodeDocument(this.tableName, this.tableSchema, convexDocument);
	}
	filter(
		predicate: (
			q: FilterBuilder<TableInfoFromConfectTableInfo<ConfectTableInfo>>,
		) => Expression<boolean>,
	) {
		return new ConfectQueryImpl(
			this.q.filter(predicate),
			this.tableSchema,
			this.tableName,
		);
	}
	order(order: "asc" | "desc"): ConfectQueryImpl<ConfectTableInfo, TableName> {
		return new ConfectQueryImpl(
			this.q.order(order),
			this.tableSchema,
			this.tableName,
		);
	}
	paginate(
		paginationOpts: PaginationOptions,
	): Effect.Effect<PaginationResult<ConfectTableInfo["confectDocument"]>> {
		return pipe(
			Effect.Do,
			Effect.bind("paginationResult", () =>
				Effect.promise(() => this.q.paginate(paginationOpts)),
			),
			Effect.let("parsedPage", ({ paginationResult }) =>
				pipe(
					paginationResult.page,
					Array.map((document) => this.decode(document)),
				),
			),
			Effect.map(({ paginationResult, parsedPage }) => ({
				page: parsedPage,
				isDone: paginationResult.isDone,
				continueCursor: paginationResult.continueCursor,
				/* v8 ignore next -- @preserve */
				...(paginationResult.splitCursor
					? { splitCursor: paginationResult.splitCursor }
					: {}),
				/* v8 ignore next -- @preserve */
				...(paginationResult.pageStatus
					? { pageStatus: paginationResult.pageStatus }
					: {}),
			})),
		);
	}
	// It could be better to implement collect() with stream()
	collect(): Effect.Effect<ConfectTableInfo["confectDocument"][]> {
		return pipe(
			Effect.promise(() => this.q.collect()),
			Effect.map(Array.map((document) => this.decode(document))),
		);
	}
	take(n: number): Effect.Effect<ConfectTableInfo["confectDocument"][]> {
		return pipe(
			this.stream(),
			Stream.take(n),
			Stream.runCollect,
			Effect.map((chunk) => Chunk.toArray(chunk)),
		);
	}
	first(): Effect.Effect<Option.Option<ConfectTableInfo["confectDocument"]>> {
		return pipe(this.stream(), Stream.runHead);
	}
	unique(): Effect.Effect<
		Option.Option<ConfectTableInfo["confectDocument"]>,
		NotUniqueError
	> {
		return pipe(
			this.stream(),
			Stream.take(2),
			Stream.runCollect,
			Effect.andThen((chunk) =>
				pipe(
					chunk,
					Chunk.get(1),
					Option.match({
						onSome: () => Effect.fail(new NotUniqueError()),
						onNone: () => Effect.succeed(Chunk.get(chunk, 0)),
					}),
				),
			),
		);
	}
	stream(): Stream.Stream<ConfectTableInfo["confectDocument"]> {
		return pipe(
			Stream.fromAsyncIterable(this.q, identity),
			Stream.map((document) => this.decode(document)),
			Stream.orDie,
		);
	}
}

interface ConfectQueryInitializer<
	ConfectTableInfo extends GenericConfectTableInfo,
	TableName extends string,
> extends ConfectQuery<ConfectTableInfo, TableName> {
	fullTableScan(): ConfectQuery<ConfectTableInfo, TableName>;
	withIndex<
		IndexName extends keyof Indexes<
			TableInfoFromConfectTableInfo<ConfectTableInfo>
		>,
	>(
		indexName: IndexName,
		indexRange?:
			| ((
					q: IndexRangeBuilder<
						DocumentByInfo<TableInfoFromConfectTableInfo<ConfectTableInfo>>,
						NamedIndex<
							TableInfoFromConfectTableInfo<ConfectTableInfo>,
							IndexName
						>,
						0
					>,
			  ) => IndexRange)
			| undefined,
	): ConfectQuery<ConfectTableInfo, TableName>;
	withSearchIndex<
		IndexName extends keyof SearchIndexes<
			TableInfoFromConfectTableInfo<ConfectTableInfo>
		>,
	>(
		indexName: IndexName,
		searchFilter: (
			q: SearchFilterBuilder<
				DocumentByInfo<TableInfoFromConfectTableInfo<ConfectTableInfo>>,
				NamedSearchIndex<
					TableInfoFromConfectTableInfo<ConfectTableInfo>,
					IndexName
				>
			>,
		) => SearchFilter,
	): ConfectOrderedQuery<ConfectTableInfo, TableName>;
}

class ConfectQueryInitializerImpl<
	ConfectTableInfo extends GenericConfectTableInfo,
	TableName extends string,
> implements ConfectQueryInitializer<ConfectTableInfo, TableName>
{
	q: QueryInitializer<TableInfoFromConfectTableInfo<ConfectTableInfo>>;
	tableSchema: Schema.Schema<
		ConfectTableInfo["confectDocument"],
		ConfectTableInfo["encodedConfectDocument"]
	>;
	tableName: TableName;
	constructor(
		q: QueryInitializer<TableInfoFromConfectTableInfo<ConfectTableInfo>>,
		tableSchema: Schema.Schema<
			ConfectTableInfo["confectDocument"],
			ConfectTableInfo["encodedConfectDocument"]
		>,
		tableName: TableName,
	) {
		this.q = q;
		this.tableSchema = tableSchema;
		this.tableName = tableName;
	}
	fullTableScan(): ConfectQuery<ConfectTableInfo, TableName> {
		return new ConfectQueryImpl(
			this.q.fullTableScan(),
			this.tableSchema,
			this.tableName,
		);
	}
	withIndex<
		IndexName extends keyof Indexes<
			TableInfoFromConfectTableInfo<ConfectTableInfo>
		>,
	>(
		indexName: IndexName,
		indexRange?:
			| ((
					q: IndexRangeBuilder<
						DocumentByInfo<TableInfoFromConfectTableInfo<ConfectTableInfo>>,
						NamedIndex<
							TableInfoFromConfectTableInfo<ConfectTableInfo>,
							IndexName
						>,
						0
					>,
			  ) => IndexRange)
			| undefined,
	): ConfectQuery<ConfectTableInfo, TableName> {
		return new ConfectQueryImpl(
			this.q.withIndex(indexName, indexRange),
			this.tableSchema,
			this.tableName,
		);
	}
	withSearchIndex<
		IndexName extends keyof SearchIndexes<
			TableInfoFromConfectTableInfo<ConfectTableInfo>
		>,
	>(
		indexName: IndexName,
		searchFilter: (
			q: SearchFilterBuilder<
				DocumentByInfo<TableInfoFromConfectTableInfo<ConfectTableInfo>>,
				NamedSearchIndex<
					TableInfoFromConfectTableInfo<ConfectTableInfo>,
					IndexName
				>
			>,
		) => SearchFilter,
	): ConfectOrderedQuery<ConfectTableInfo, TableName> {
		return new ConfectQueryImpl(
			this.q.withSearchIndex(indexName, searchFilter),
			this.tableSchema,
			this.tableName,
		);
	}
	filter(
		predicate: (
			q: FilterBuilder<TableInfoFromConfectTableInfo<ConfectTableInfo>>,
		) => Expression<boolean>,
	): ConfectQuery<ConfectTableInfo, TableName> {
		return this.fullTableScan().filter(predicate);
	}
	order(
		order: "asc" | "desc",
	): ConfectOrderedQuery<ConfectTableInfo, TableName> {
		return this.fullTableScan().order(order);
	}
	paginate(
		paginationOpts: PaginationOptions,
	): Effect.Effect<PaginationResult<ConfectTableInfo["confectDocument"]>> {
		return this.fullTableScan().paginate(paginationOpts);
	}
	collect(): Effect.Effect<ConfectTableInfo["confectDocument"][]> {
		return this.fullTableScan().collect();
	}
	take(n: number): Effect.Effect<ConfectTableInfo["confectDocument"][]> {
		return this.fullTableScan().take(n);
	}
	first(): Effect.Effect<Option.Option<ConfectTableInfo["confectDocument"]>> {
		return this.fullTableScan().first();
	}
	unique(): Effect.Effect<
		Option.Option<ConfectTableInfo["confectDocument"]>,
		NotUniqueError
	> {
		return this.fullTableScan().unique();
	}
	stream(): Stream.Stream<ConfectTableInfo["confectDocument"]> {
		return this.fullTableScan().stream();
	}
}

export type DatabaseSchemasFromConfectDataModel<
	ConfectDataModel extends GenericConfectDataModel,
> = {
	[TableName in keyof ConfectDataModel & string]: Schema.Schema<
		ConfectDataModel[TableName]["confectDocument"],
		ConfectDataModel[TableName]["encodedConfectDocument"]
	>;
};

export interface ConfectDatabaseReader<
	ConfectDataModel extends GenericConfectDataModel,
> extends ConfectBaseDatabaseReader<ConfectDataModel> {
	system: ConfectBaseDatabaseReader<ConfectSystemDataModel>;
}

export interface ConfectBaseDatabaseReader<
	ConfectDataModel extends GenericConfectDataModel,
> {
	query<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
	): ConfectQueryInitializer<ConfectDataModel[TableName], TableName>;
	get<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		id: GenericId<TableName>,
	): Effect.Effect<
		Option.Option<ConfectDataModel[TableName]["confectDocument"]>
	>;
	normalizeId<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
		id: string,
	): Option.Option<GenericId<TableName>>;
}

export class ConfectBaseDatabaseReaderImpl<
	ConfectDataModel extends GenericConfectDataModel,
> implements ConfectBaseDatabaseReader<ConfectDataModel>
{
	db: BaseDatabaseReader<DataModelFromConfectDataModel<ConfectDataModel>>;
	databaseSchemas: DatabaseSchemasFromConfectDataModel<ConfectDataModel>;
	constructor(
		db: BaseDatabaseReader<DataModelFromConfectDataModel<ConfectDataModel>>,
		databaseSchemas: DatabaseSchemasFromConfectDataModel<ConfectDataModel>,
	) {
		this.db = db;
		this.databaseSchemas = databaseSchemas;
	}
	decode<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
		convexDocument: ConfectDataModel[TableName]["encodedConfectDocument"],
	): ConfectDataModel[TableName]["confectDocument"] {
		return decodeDocument(
			tableName,
			this.databaseSchemas[tableName],
			convexDocument,
		);
	}
	tableName(
		id: GenericId<TableNamesInConfectDataModel<ConfectDataModel>>,
	): Option.Option<TableNamesInConfectDataModel<ConfectDataModel>> {
		return Array.findFirst(Record.keys(this.databaseSchemas), (tableName) =>
			Option.isSome(this.normalizeId(tableName, id)),
		);
	}
	normalizeId<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
		id: string,
	): Option.Option<GenericId<TableName>> {
		return Option.fromNullable(this.db.normalizeId(tableName, id));
	}
	get<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		id: GenericId<TableName>,
	): Effect.Effect<
		Option.Option<ConfectDataModel[TableName]["confectDocument"]>
	> {
		return Effect.gen(this, function* () {
			const optionConvexDoc = yield* Effect.promise(() => this.db.get(id)).pipe(
				Effect.map(Option.fromNullable),
			);
			const tableName = yield* this.tableName(id).pipe(Effect.orDie);
			return pipe(
				optionConvexDoc,
				Option.map((convexDoc) => this.decode(tableName, convexDoc)),
			);
		});
	}
	query<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
	): ConfectQueryInitializer<ConfectDataModel[TableName], TableName> {
		return new ConfectQueryInitializerImpl(
			this.db.query(tableName),
			this.databaseSchemas[tableName],
			tableName,
		);
	}
}

export class ConfectDatabaseReaderImpl<
	ConfectDataModel extends GenericConfectDataModel,
> implements ConfectDatabaseReader<ConfectDataModel>
{
	db: GenericDatabaseReader<DataModelFromConfectDataModel<ConfectDataModel>>;
	databaseSchemas: DatabaseSchemasFromConfectDataModel<ConfectDataModel>;
	system: ConfectBaseDatabaseReader<ConfectSystemDataModel>;
	constructor(
		db: GenericDatabaseReader<DataModelFromConfectDataModel<ConfectDataModel>>,
		databaseSchemas: DatabaseSchemasFromConfectDataModel<ConfectDataModel>,
	) {
		this.db = db;
		this.databaseSchemas = databaseSchemas;
		this.system = new ConfectBaseDatabaseReaderImpl<ConfectSystemDataModel>(
			this.db.system,
			databaseSchemasFromConfectSchema(
				confectSystemSchemaDefinition.confectSchema,
			),
		);
	}
	decode<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
		convexDocument: ConfectDataModel[TableName]["encodedConfectDocument"],
	): ConfectDataModel[TableName]["confectDocument"] {
		return decodeDocument(
			tableName,
			this.databaseSchemas[tableName],
			convexDocument,
		);
	}
	tableName(
		id: GenericId<TableNamesInConfectDataModel<ConfectDataModel>>,
	): Option.Option<TableNamesInConfectDataModel<ConfectDataModel>> {
		return Array.findFirst(Record.keys(this.databaseSchemas), (tableName) =>
			Option.isSome(this.normalizeId(tableName, id)),
		);
	}
	normalizeId<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
		id: string,
	): Option.Option<GenericId<TableName>> {
		return Option.fromNullable(this.db.normalizeId(tableName, id));
	}
	get<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		id: GenericId<TableName>,
	): Effect.Effect<
		Option.Option<ConfectDataModel[TableName]["confectDocument"]>
	> {
		return Effect.gen(this, function* () {
			const optionConvexDoc = yield* Effect.promise(() => this.db.get(id)).pipe(
				Effect.map(Option.fromNullable),
			);
			const tableName = yield* this.tableName(id).pipe(Effect.orDie);
			return pipe(
				optionConvexDoc,
				Option.map((convexDoc) => this.decode(tableName, convexDoc)),
			);
		});
	}
	query<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
	): ConfectQueryInitializer<ConfectDataModel[TableName], TableName> {
		return new ConfectQueryInitializerImpl(
			this.db.query(tableName),
			this.databaseSchemas[tableName],
			tableName,
		);
	}
}

export interface ConfectDatabaseWriter<
	ConfectDataModel extends GenericConfectDataModel,
> {
	query<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
	): ConfectQueryInitializer<ConfectDataModel[TableName], TableName>;
	get<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		id: GenericId<TableName>,
	): Effect.Effect<
		Option.Option<ConfectDataModel[TableName]["confectDocument"]>
	>;
	normalizeId<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
		id: string,
	): Option.Option<GenericId<TableName>>;
	insert<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		table: TableName,
		value: WithoutSystemFields<
			ConfectDocumentByName<ConfectDataModel, TableName>
		>,
	): Effect.Effect<GenericId<TableName>, ParseResult.ParseError>;
	patch<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		id: GenericId<TableName>,
		value: Partial<
			WithoutSystemFields<ConfectDocumentByName<ConfectDataModel, TableName>>
		>,
	): Effect.Effect<void, ParseResult.ParseError | Cause.NoSuchElementException>;
	replace<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		id: GenericId<TableName>,
		value: WithOptionalSystemFields<
			ConfectDocumentByName<ConfectDataModel, TableName>
		>,
	): Effect.Effect<void>;
	delete(id: GenericId<string>): Effect.Effect<void>;
}

export class ConfectDatabaseWriterImpl<
	ConfectDataModel extends GenericConfectDataModel,
> implements ConfectDatabaseWriter<ConfectDataModel>
{
	databaseSchemas: DatabaseSchemasFromConfectDataModel<ConfectDataModel>;
	db: GenericDatabaseWriter<DataModelFromConfectDataModel<ConfectDataModel>>;
	reader: ConfectDatabaseReader<ConfectDataModel>;
	constructor(
		db: GenericDatabaseWriter<DataModelFromConfectDataModel<ConfectDataModel>>,
		databaseSchemas: DatabaseSchemasFromConfectDataModel<ConfectDataModel>,
	) {
		this.db = db;
		this.databaseSchemas = databaseSchemas;
		this.reader = new ConfectDatabaseReaderImpl(db, databaseSchemas);
	}
	tableName(
		id: GenericId<TableNamesInConfectDataModel<ConfectDataModel>>,
	): Option.Option<TableNamesInConfectDataModel<ConfectDataModel>> {
		return Array.findFirst(Record.keys(this.databaseSchemas), (tableName) =>
			Option.isSome(this.normalizeId(tableName, id)),
		);
	}
	query<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
	): ConfectQueryInitializer<ConfectDataModel[TableName], TableName> {
		return this.reader.query(tableName);
	}
	get<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		id: GenericId<TableName>,
	): Effect.Effect<
		Option.Option<ConfectDataModel[TableName]["confectDocument"]>
	> {
		return this.reader.get(id);
	}
	normalizeId<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		tableName: TableName,
		id: string,
	): Option.Option<GenericId<TableName>> {
		return Option.fromNullable(this.db.normalizeId(tableName, id));
	}
	insert<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		table: TableName,
		value: WithoutSystemFields<
			ConfectDocumentByName<ConfectDataModel, TableName>
		>,
	): Effect.Effect<GenericId<TableName>, ParseResult.ParseError> {
		return pipe(
			value,
			Schema.encode(this.databaseSchemas[table]),
			Effect.andThen((encodedValue) =>
				Effect.promise(() =>
					this.db.insert(
						table,
						encodedValue as Expand<
							BetterOmit<
								DocumentByName<
									DataModelFromConfectDataModel<ConfectDataModel>,
									TableName
								>,
								"_creationTime" | "_id"
							>
						>,
					),
				),
			),
		);
	}
	patch<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		id: GenericId<TableName>,
		value: Partial<
			WithoutSystemFields<ConfectDocumentByName<ConfectDataModel, TableName>>
		>,
	): Effect.Effect<
		void,
		ParseResult.ParseError | Cause.NoSuchElementException
	> {
		return Effect.gen(this, function* () {
			const tableName = yield* this.tableName(id);
			const tableSchema = this.databaseSchemas[tableName];

			const originalConvexDoc = yield* Effect.promise(() =>
				this.db.get(id),
			).pipe(
				Effect.andThen(
					(
						doc: DocumentByName<
							DataModelFromConfectDataModel<ConfectDataModel>,
							TableName
						> | null,
					) =>
						doc
							? Effect.succeed(doc)
							: Effect.die(new InvalidIdProvidedForPatch()),
				),
			);

			const originalConfectDoc =
				yield* Schema.decodeUnknown(tableSchema)(originalConvexDoc);

			const updatedConvexDoc = yield* pipe(
				value,
				Record.reduce(originalConfectDoc, (acc, value, key) =>
					value === undefined
						? Record.remove(acc, key)
						: Record.set(acc, key, value),
				),
				Schema.encodeUnknown(tableSchema),
			);

			yield* Effect.promise(() =>
				this.db.replace(
					id,
					updatedConvexDoc as Expand<
						BetterOmit<
							DocumentByName<
								DataModelFromConfectDataModel<ConfectDataModel>,
								TableName
							>,
							"_creationTime" | "_id"
						>
					>,
				),
			);
		});
	}
	replace<TableName extends TableNamesInConfectDataModel<ConfectDataModel>>(
		id: GenericId<TableName>,
		value: WithOptionalSystemFields<
			ConfectDocumentByName<ConfectDataModel, TableName>
		>,
	): Effect.Effect<void> {
		return Effect.promise(() => this.db.replace(id, value));
	}
	delete(id: GenericId<string>): Effect.Effect<void> {
		return Effect.promise(() => this.db.delete(id));
	}
}

export const databaseSchemasFromConfectSchema = <
	ConfectSchema extends GenericConfectSchema,
>(
	confectSchema: ConfectSchema,
) =>
	Record.map(
		confectSchema,
		({ tableSchema }) => tableSchema,
	) as DatabaseSchemasFromConfectDataModel<
		ConfectDataModelFromConfectSchema<ConfectSchema>
	>;

class InvalidIdProvidedForPatch extends Data.TaggedError(
	"InvalidIdProvidedForPatch",
) {}

const decodeDocument = <
	TableName extends string,
	ConvexDocument extends GenericEncodedConfectDocument,
	ConfectDocument extends GenericConfectDocument,
>(
	tableName: TableName,
	tableSchema: Schema.Schema<ConfectDocument, ConvexDocument>,
	convexDocument: ConvexDocument,
): ConfectDocument =>
	Schema.decodeUnknownSync(extendWithSystemFields(tableName, tableSchema), {
		onExcessProperty: "error",
	})(convexDocument);

// Would be better if this were exported from `convex/server`
type BaseDatabaseReader<DataModel extends GenericDataModel> = Omit<
	GenericDatabaseReader<DataModel>,
	"system"
>;
