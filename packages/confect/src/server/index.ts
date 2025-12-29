export {
	ConfectActionCtx,
	ConfectMutationCtx,
	ConfectQueryCtx,
} from "./ctx";

export type {
	ConfectDoc,
	TableNamesInConfectDataModel,
} from "./data-model";

export { NotUniqueError } from "./database";

export { type MakeFunctionsOptions, makeFunctions } from "./functions";
export {
	type HttpApi,
	makeHttpRouter,
} from "./http";
export {
	type ConfectDataModelFromConfectSchemaDefinition,
	defineSchema,
	defineTable,
} from "./schema";
export { compileSchema } from "./schema-to-validator";
export * as Id from "./schemas/Id";
export * as PaginationOpts from "./schemas/PaginationOpts";
export * as PaginationResult from "./schemas/PaginationResult";
