import {
	actionGeneric,
	type DefaultFunctionArgs,
	type GenericActionCtx,
	type GenericMutationCtx,
	type GenericQueryCtx,
	internalActionGeneric,
	internalMutationGeneric,
	internalQueryGeneric,
	mutationGeneric,
	queryGeneric,
	type RegisteredAction,
	type RegisteredMutation,
	type RegisteredQuery,
} from "convex/server";
import { Effect, pipe, Schema } from "effect";

import {
	ConfectActionCtx,
	ConfectMutationCtx,
	ConfectQueryCtx,
	makeConfectActionCtx,
	makeConfectMutationCtx,
	makeConfectQueryCtx,
} from "./ctx";
import type {
	DataModelFromConfectDataModel,
	GenericConfectDataModel,
} from "./data-model";
import {
	type DatabaseSchemasFromConfectDataModel,
	databaseSchemasFromConfectSchema,
} from "./database";
import type {
	ConfectDataModelFromConfectSchema,
	ConfectSchemaDefinition,
	GenericConfectSchema,
} from "./schema";
import { compileArgsSchema, compileReturnsSchema } from "./schema-to-validator";

type MutationBuilder = typeof mutationGeneric;
type InternalMutationBuilder = typeof internalMutationGeneric;

export interface MakeFunctionsOptions {
	mutationBuilder?: MutationBuilder;
	internalMutationBuilder?: InternalMutationBuilder;
}

export const makeFunctions = <ConfectSchema extends GenericConfectSchema>(
	confectSchemaDefinition: ConfectSchemaDefinition<ConfectSchema>,
	options?: MakeFunctionsOptions,
) => {
	const databaseSchemas = databaseSchemasFromConfectSchema(
		confectSchemaDefinition.confectSchema,
	);

	const mutationBuilder = options?.mutationBuilder ?? mutationGeneric;
	const internalMutationBuilder =
		options?.internalMutationBuilder ?? internalMutationGeneric;

	const query = <
		ConvexArgs extends DefaultFunctionArgs,
		ConfectArgs,
		ConvexReturns,
		ConfectReturns,
		E,
	>({
		args,
		returns,
		handler,
	}: {
		args: Schema.Schema<ConfectArgs, ConvexArgs>;
		returns: Schema.Schema<ConfectReturns, ConvexReturns>;
		handler: (
			a: ConfectArgs,
		) => Effect.Effect<
			ConfectReturns,
			E,
			ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredQuery<"public", ConvexArgs, Promise<ConvexReturns>> =>
		queryGeneric(
			confectQueryFunction({ databaseSchemas, args, returns, handler }),
		);

	const internalQuery = <
		ConvexArgs extends DefaultFunctionArgs,
		ConfectArgs,
		ConvexReturns,
		ConfectReturns,
		E,
	>({
		args,
		handler,
		returns,
	}: {
		args: Schema.Schema<ConfectArgs, ConvexArgs>;
		returns: Schema.Schema<ConfectReturns, ConvexReturns>;
		handler: (
			a: ConfectArgs,
		) => Effect.Effect<
			ConfectReturns,
			E,
			ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredQuery<"internal", ConvexArgs, Promise<ConvexReturns>> =>
		internalQueryGeneric(
			confectQueryFunction({ databaseSchemas, args, returns, handler }),
		);

	const mutation = <
		ConvexValue extends DefaultFunctionArgs,
		ConfectValue,
		ConvexReturns,
		ConfectReturns,
		E,
	>({
		args,
		returns,
		handler,
	}: {
		args: Schema.Schema<ConfectValue, ConvexValue>;
		returns: Schema.Schema<ConfectReturns, ConvexReturns>;
		handler: (
			a: ConfectValue,
		) => Effect.Effect<
			ConfectReturns,
			E,
			ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredMutation<"public", ConvexValue, Promise<ConvexReturns>> =>
		mutationBuilder(
			confectMutationFunction({ databaseSchemas, args, returns, handler }),
		);

	const internalMutation = <
		ConvexValue extends DefaultFunctionArgs,
		ConfectValue,
		ConvexReturns,
		ConfectReturns,
		E,
	>({
		args,
		returns,
		handler,
	}: {
		args: Schema.Schema<ConfectValue, ConvexValue>;
		returns: Schema.Schema<ConfectReturns, ConvexReturns>;
		handler: (
			a: ConfectValue,
		) => Effect.Effect<
			ConfectReturns,
			E,
			ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredMutation<"internal", ConvexValue, Promise<ConvexReturns>> =>
		internalMutationBuilder(
			confectMutationFunction({ databaseSchemas, args, returns, handler }),
		);

	const action = <
		ConvexValue extends DefaultFunctionArgs,
		ConfectValue,
		ConvexReturns,
		ConfectReturns,
		E,
	>({
		args,
		returns,
		handler,
	}: {
		args: Schema.Schema<ConfectValue, ConvexValue>;
		returns: Schema.Schema<ConfectReturns, ConvexReturns>;
		handler: (
			a: ConfectValue,
		) => Effect.Effect<
			ConfectReturns,
			E,
			ConfectActionCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredAction<"public", ConvexValue, Promise<ConvexReturns>> =>
		actionGeneric(confectActionFunction({ args, returns, handler }));

	const internalAction = <
		ConvexValue extends DefaultFunctionArgs,
		ConfectValue,
		ConvexReturns,
		ConfectReturns,
		E,
	>({
		args,
		returns,
		handler,
	}: {
		args: Schema.Schema<ConfectValue, ConvexValue>;
		returns: Schema.Schema<ConfectReturns, ConvexReturns>;
		handler: (
			a: ConfectValue,
		) => Effect.Effect<
			ConfectReturns,
			E,
			ConfectActionCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredAction<"internal", ConvexValue, Promise<ConvexReturns>> =>
		internalActionGeneric(confectActionFunction({ args, returns, handler }));

	return {
		query,
		internalQuery,
		mutation,
		internalMutation,
		action,
		internalAction,
	};
};

const confectQueryFunction = <
	ConfectDataModel extends GenericConfectDataModel,
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexReturns,
	ConfectReturns,
	E,
>({
	databaseSchemas,
	args,
	returns,
	handler,
}: {
	databaseSchemas: DatabaseSchemasFromConfectDataModel<ConfectDataModel>;
	args: Schema.Schema<ConfectArgs, ConvexArgs>;
	returns: Schema.Schema<ConfectReturns, ConvexReturns>;
	handler: (
		a: ConfectArgs,
	) => Effect.Effect<ConfectReturns, E, ConfectQueryCtx<ConfectDataModel>>;
}) => ({
	args: compileArgsSchema(args),
	returns: compileReturnsSchema(returns),
	handler: (
		ctx: GenericQueryCtx<DataModelFromConfectDataModel<ConfectDataModel>>,
		actualArgs: ConvexArgs,
	): Promise<ConvexReturns> =>
		pipe(
			actualArgs,
			Schema.decode(args),
			Effect.orDie,
			Effect.andThen((decodedArgs) =>
				handler(decodedArgs).pipe(
					Effect.provideService(
						ConfectQueryCtx<ConfectDataModel>(),
						makeConfectQueryCtx(ctx, databaseSchemas),
					),
				),
			),
			Effect.andThen((convexReturns) =>
				Schema.encodeUnknown(returns)(convexReturns),
			),
			Effect.runPromise,
		),
});

const confectMutationFunction = <
	ConfectDataModel extends GenericConfectDataModel,
	ConvexValue extends DefaultFunctionArgs,
	ConfectValue,
	ConvexReturns,
	ConfectReturns,
	E,
>({
	databaseSchemas,
	args,
	returns,
	handler,
}: {
	databaseSchemas: DatabaseSchemasFromConfectDataModel<ConfectDataModel>;
	args: Schema.Schema<ConfectValue, ConvexValue>;
	returns: Schema.Schema<ConfectReturns, ConvexReturns>;
	handler: (
		a: ConfectValue,
	) => Effect.Effect<ConfectReturns, E, ConfectMutationCtx<ConfectDataModel>>;
}) => ({
	args: compileArgsSchema(args),
	returns: compileReturnsSchema(returns),
	handler: (
		ctx: GenericMutationCtx<DataModelFromConfectDataModel<ConfectDataModel>>,
		actualArgs: ConvexValue,
	): Promise<ConvexReturns> =>
		pipe(
			actualArgs,
			Schema.decode(args),
			Effect.orDie,
			Effect.andThen((decodedArgs) =>
				handler(decodedArgs).pipe(
					Effect.provideService(
						ConfectMutationCtx<ConfectDataModel>(),
						makeConfectMutationCtx(ctx, databaseSchemas),
					),
				),
			),
			Effect.andThen((convexReturns) =>
				Schema.encodeUnknown(returns)(convexReturns),
			),
			Effect.runPromise,
		),
});

const confectActionFunction = <
	ConfectDataModel extends GenericConfectDataModel,
	ConvexValue extends DefaultFunctionArgs,
	ConfectValue,
	ConvexReturns,
	ConfectReturns,
	E,
>({
	args,
	returns,
	handler,
}: {
	args: Schema.Schema<ConfectValue, ConvexValue>;
	returns: Schema.Schema<ConfectReturns, ConvexReturns>;
	handler: (
		a: ConfectValue,
	) => Effect.Effect<ConfectReturns, E, ConfectActionCtx<ConfectDataModel>>;
}) => ({
	args: compileArgsSchema(args),
	returns: compileReturnsSchema(returns),
	handler: (
		ctx: GenericActionCtx<DataModelFromConfectDataModel<ConfectDataModel>>,
		actualArgs: ConvexValue,
	): Promise<ConvexReturns> =>
		pipe(
			actualArgs,
			Schema.decode(args),
			Effect.orDie,
			Effect.andThen((decodedArgs) =>
				handler(decodedArgs).pipe(
					Effect.provideService(
						ConfectActionCtx<ConfectDataModel>(),
						makeConfectActionCtx(ctx),
					),
				),
			),
			Effect.andThen((convexReturns) =>
				Schema.encodeUnknown(returns)(convexReturns),
			),
			Effect.runPromise,
		),
});
