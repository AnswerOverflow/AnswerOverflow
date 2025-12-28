import {
	ConfectActionCtx as ConfectActionCtxService,
	type ConfectActionCtx as ConfectActionCtxType,
	type ConfectDataModelFromConfectSchemaDefinition,
	type ConfectDoc as ConfectDocType,
	ConfectMutationCtx as ConfectMutationCtxService,
	type ConfectMutationCtx as ConfectMutationCtxType,
	ConfectQueryCtx as ConfectQueryCtxService,
	type ConfectQueryCtx as ConfectQueryCtxType,
	makeFunctions,
	type TableNamesInConfectDataModel,
} from "@packages/confect/server";
import { confectSchema } from "./confectSchema";
import {
	mutation as triggerMutation,
	internalMutation as triggerInternalMutation,
} from "./triggers";

export const {
	query,
	mutation,
	action,
	internalQuery,
	internalMutation,
	internalAction,
} = makeFunctions(confectSchema, {
	mutationBuilder: triggerMutation,
	internalMutationBuilder: triggerInternalMutation,
});

type ConfectSchema = typeof confectSchema;

type ConfectDataModel =
	ConfectDataModelFromConfectSchemaDefinition<ConfectSchema>;

export type ConfectDoc<
	TableName extends TableNamesInConfectDataModel<ConfectDataModel>,
> = ConfectDocType<ConfectDataModel, TableName>;

export const ConfectQueryCtx = ConfectQueryCtxService<ConfectDataModel>();
export type ConfectQueryCtx = ConfectQueryCtxType<ConfectDataModel>;

export const ConfectMutationCtx = ConfectMutationCtxService<ConfectDataModel>();
export type ConfectMutationCtx = ConfectMutationCtxType<ConfectDataModel>;

export const ConfectActionCtx = ConfectActionCtxService<ConfectDataModel>();
export type ConfectActionCtx = ConfectActionCtxType<ConfectDataModel>;
