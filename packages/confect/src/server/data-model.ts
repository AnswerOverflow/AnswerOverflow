import type {
	GenericDocument,
	GenericFieldPaths,
	GenericTableIndexes,
	GenericTableSearchIndexes,
	GenericTableVectorIndexes,
} from "convex/server";
import type { ReadonlyRecord } from "effect/Record";
import type { ReadonlyValue } from "./schema-to-validator";

export type GenericConfectDocument = ReadonlyRecord<string, any>;

export type GenericEncodedConfectDocument = ReadonlyRecord<
	string,
	ReadonlyValue
>;

export type ConfectDocumentByName<
	ConfectDataModel extends GenericConfectDataModel,
	TableName extends TableNamesInConfectDataModel<ConfectDataModel>,
> = ConfectDataModel[TableName]["confectDocument"];

export type GenericConfectDataModel = Record<string, GenericConfectTableInfo>;

export type DataModelFromConfectDataModel<
	ConfectDataModel extends GenericConfectDataModel,
> = {
	[TableName in keyof ConfectDataModel & string]: TableInfoFromConfectTableInfo<
		ConfectDataModel[TableName]
	>;
};

export type TableNamesInConfectDataModel<
	ConfectDataModel extends GenericConfectDataModel,
> = keyof ConfectDataModel & string;

export type TableInfoFromConfectTableInfo<
	ConfectTableInfo extends GenericConfectTableInfo,
> = {
	document: ConfectTableInfo["convexDocument"];
	fieldPaths: ConfectTableInfo["fieldPaths"];
	indexes: ConfectTableInfo["indexes"];
	searchIndexes: ConfectTableInfo["searchIndexes"];
	vectorIndexes: ConfectTableInfo["vectorIndexes"];
};

export type GenericConfectTableInfo = {
	confectDocument: GenericConfectDocument;
	encodedConfectDocument: GenericEncodedConfectDocument;
	convexDocument: GenericDocument;
	fieldPaths: GenericFieldPaths;
	indexes: GenericTableIndexes;
	searchIndexes: GenericTableSearchIndexes;
	vectorIndexes: GenericTableVectorIndexes;
};

/**
 * The Confect document encoded for storage in Convex. This is the data as it is stored in the database.
 */
export type ConfectDoc<
	ConfectDataModel extends GenericConfectDataModel,
	TableName extends TableNamesInConfectDataModel<ConfectDataModel>,
> = ConfectDataModel[TableName]["encodedConfectDocument"];
