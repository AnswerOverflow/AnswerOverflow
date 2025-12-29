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
		ConvexError,
		ConfectError extends { readonly _tag: string },
	>(
		config:
			| {
					args: Schema.Schema<ConfectArgs, ConvexArgs>;
					returns: Schema.Schema<ConfectReturns, ConvexReturns>;
					handler: (
						a: ConfectArgs,
					) => Effect.Effect<
						ConfectReturns,
						never,
						ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>;
			  }
			| {
					args: Schema.Schema<ConfectArgs, ConvexArgs>;
					success: Schema.Schema<ConfectReturns, ConvexReturns>;
					error: Schema.Schema<ConfectError, ConvexError>;
					handler: (
						a: ConfectArgs,
					) => Effect.Effect<
						ConfectReturns,
						ConfectError,
						ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>;
			  },
	): "returns" extends keyof typeof config
		? RegisteredQuery<"public", ConvexArgs, Promise<ConvexReturns>>
		: RegisteredQuery<
				"public",
				ConvexArgs,
				Promise<{ _tag: "Success"; data: ConvexReturns } | ConvexError>
			> => {
		if ("returns" in config) {
			return queryGeneric(
				confectQueryFunctionDirect({
					databaseSchemas,
					args: config.args,
					returns: config.returns as Schema.Schema<unknown, ConvexReturns>,
					handler: config.handler as (
						a: unknown,
					) => Effect.Effect<
						unknown,
						never,
						ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>,
				}),
			) as ReturnType<typeof query>;
		}

		return queryGeneric(
			confectQueryFunctionWithResult({
				databaseSchemas,
				args: config.args,
				success: config.success as unknown as Schema.Schema<
					unknown,
					ConvexReturns
				>,
				error: config.error as unknown as Schema.Schema<
					{ readonly _tag: string },
					ConvexError
				>,
				handler: config.handler as (
					a: unknown,
				) => Effect.Effect<
					unknown,
					{ readonly _tag: string },
					ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
				>,
			}),
		) as ReturnType<typeof query>;
	};

	const internalQuery = <
		ConvexArgs extends DefaultFunctionArgs,
		ConfectArgs,
		ConvexReturns,
		ConfectReturns,
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
			never,
			ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredQuery<"internal", ConvexArgs, Promise<ConvexReturns>> =>
		internalQueryGeneric(
			confectQueryFunctionDirect({
				databaseSchemas,
				args,
				returns: returns as Schema.Schema<unknown, ConvexReturns>,
				handler: handler as (
					a: unknown,
				) => Effect.Effect<
					unknown,
					never,
					ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
				>,
			}),
		);

	const mutation = <
		ConvexValue extends DefaultFunctionArgs,
		ConfectValue,
		ConvexReturns,
		ConfectReturns,
		ConvexError,
		ConfectError extends { readonly _tag: string },
	>(
		config:
			| {
					args: Schema.Schema<ConfectValue, ConvexValue>;
					returns: Schema.Schema<ConfectReturns, ConvexReturns>;
					handler: (
						a: ConfectValue,
					) => Effect.Effect<
						ConfectReturns,
						never,
						ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>;
			  }
			| {
					args: Schema.Schema<ConfectValue, ConvexValue>;
					success: Schema.Schema<ConfectReturns, ConvexReturns>;
					error: Schema.Schema<ConfectError, ConvexError>;
					handler: (
						a: ConfectValue,
					) => Effect.Effect<
						ConfectReturns,
						ConfectError,
						ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>;
			  },
	): "returns" extends keyof typeof config
		? RegisteredMutation<"public", ConvexValue, Promise<ConvexReturns>>
		: RegisteredMutation<
				"public",
				ConvexValue,
				Promise<{ _tag: "Success"; data: ConvexReturns } | ConvexError>
			> => {
		if ("returns" in config) {
			return mutationBuilder(
				confectMutationFunctionDirect({
					databaseSchemas,
					args: config.args,
					returns: config.returns as Schema.Schema<unknown, ConvexReturns>,
					handler: config.handler as (
						a: unknown,
					) => Effect.Effect<
						unknown,
						never,
						ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>,
				}),
			) as ReturnType<typeof mutation>;
		}

		return mutationBuilder(
			confectMutationFunctionWithResult({
				databaseSchemas,
				args: config.args,
				success: config.success as unknown as Schema.Schema<
					unknown,
					ConvexReturns
				>,
				error: config.error as unknown as Schema.Schema<
					{ readonly _tag: string },
					ConvexError
				>,
				handler: config.handler as (
					a: unknown,
				) => Effect.Effect<
					unknown,
					{ readonly _tag: string },
					ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
				>,
			}),
		) as ReturnType<typeof mutation>;
	};

	const internalMutation = <
		ConvexValue extends DefaultFunctionArgs,
		ConfectValue,
		ConvexReturns,
		ConfectReturns,
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
			never,
			ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredMutation<"internal", ConvexValue, Promise<ConvexReturns>> =>
		internalMutationBuilder(
			confectMutationFunctionDirect({
				databaseSchemas,
				args,
				returns: returns as Schema.Schema<unknown, ConvexReturns>,
				handler: handler as (
					a: unknown,
				) => Effect.Effect<
					unknown,
					never,
					ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
				>,
			}),
		);

	const action = <
		ConvexValue extends DefaultFunctionArgs,
		ConfectValue,
		ConvexReturns,
		ConfectReturns,
		ConvexError,
		ConfectError extends { readonly _tag: string },
	>(
		config:
			| {
					args: Schema.Schema<ConfectValue, ConvexValue>;
					returns: Schema.Schema<ConfectReturns, ConvexReturns>;
					handler: (
						a: ConfectValue,
					) => Effect.Effect<
						ConfectReturns,
						never,
						ConfectActionCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>;
			  }
			| {
					args: Schema.Schema<ConfectValue, ConvexValue>;
					success: Schema.Schema<ConfectReturns, ConvexReturns>;
					error: Schema.Schema<ConfectError, ConvexError>;
					handler: (
						a: ConfectValue,
					) => Effect.Effect<
						ConfectReturns,
						ConfectError,
						ConfectActionCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>;
			  },
	): "returns" extends keyof typeof config
		? RegisteredAction<"public", ConvexValue, Promise<ConvexReturns>>
		: RegisteredAction<
				"public",
				ConvexValue,
				Promise<{ _tag: "Success"; data: ConvexReturns } | ConvexError>
			> => {
		if ("returns" in config) {
			return actionGeneric(
				confectActionFunctionDirect({
					args: config.args,
					returns: config.returns as Schema.Schema<unknown, ConvexReturns>,
					handler: config.handler as (
						a: unknown,
					) => Effect.Effect<
						unknown,
						never,
						ConfectActionCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>,
				}),
			) as ReturnType<typeof action>;
		}

		return actionGeneric(
			confectActionFunctionWithResult({
				args: config.args,
				success: config.success as unknown as Schema.Schema<
					unknown,
					ConvexReturns
				>,
				error: config.error as unknown as Schema.Schema<
					{ readonly _tag: string },
					ConvexError
				>,
				handler: config.handler as (
					a: unknown,
				) => Effect.Effect<
					unknown,
					{ readonly _tag: string },
					ConfectActionCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
				>,
			}),
		) as ReturnType<typeof action>;
	};

	const internalAction = <
		ConvexValue extends DefaultFunctionArgs,
		ConfectValue,
		ConvexReturns,
		ConfectReturns,
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
			never,
			ConfectActionCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredAction<"internal", ConvexValue, Promise<ConvexReturns>> =>
		internalActionGeneric(
			confectActionFunctionDirect({
				args,
				returns: returns as Schema.Schema<unknown, ConvexReturns>,
				handler: handler as (
					a: unknown,
				) => Effect.Effect<
					unknown,
					never,
					ConfectActionCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
				>,
			}),
		);

	return {
		query,
		internalQuery,
		mutation,
		internalMutation,
		action,
		internalAction,
	};
};

const confectQueryFunctionDirect = <
	ConfectDataModel extends GenericConfectDataModel,
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexReturns,
	ConfectReturns,
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
	) => Effect.Effect<ConfectReturns, never, ConfectQueryCtx<ConfectDataModel>>;
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
			Effect.andThen((result) => Schema.encode(returns)(result)),
			Effect.runPromise,
		),
});

const confectQueryFunctionWithResult = <
	ConfectDataModel extends GenericConfectDataModel,
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>({
	databaseSchemas,
	args,
	success,
	error,
	handler,
}: {
	databaseSchemas: DatabaseSchemasFromConfectDataModel<ConfectDataModel>;
	args: Schema.Schema<ConfectArgs, ConvexArgs>;
	success: Schema.Schema<ConfectSuccess, ConvexSuccess>;
	error: Schema.Schema<ConfectError, ConvexError>;
	handler: (
		a: ConfectArgs,
	) => Effect.Effect<
		ConfectSuccess,
		ConfectError,
		ConfectQueryCtx<ConfectDataModel>
	>;
}) => {
	const successSchema = Schema.Struct({
		_tag: Schema.Literal("Success"),
		data: success,
	});
	const resultSchema = Schema.Union(successSchema, error);

	return {
		args: compileArgsSchema(args),
		returns: compileReturnsSchema(resultSchema),
		handler: (
			ctx: GenericQueryCtx<DataModelFromConfectDataModel<ConfectDataModel>>,
			actualArgs: ConvexArgs,
		): Promise<{ _tag: "Success"; data: ConvexSuccess } | ConvexError> =>
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
				Effect.map(
					(data): { _tag: "Success"; data: ConfectSuccess } | ConfectError => ({
						_tag: "Success",
						data,
					}),
				),
				Effect.catchAll((e: ConfectError) => Effect.succeed(e)),
				Effect.andThen((result) => Schema.encodeUnknown(resultSchema)(result)),
				Effect.runPromise,
			),
	};
};

const confectMutationFunctionDirect = <
	ConfectDataModel extends GenericConfectDataModel,
	ConvexValue extends DefaultFunctionArgs,
	ConfectValue,
	ConvexReturns,
	ConfectReturns,
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
	) => Effect.Effect<
		ConfectReturns,
		never,
		ConfectMutationCtx<ConfectDataModel>
	>;
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
			Effect.andThen((result) => Schema.encode(returns)(result)),
			Effect.runPromise,
		),
});

const confectMutationFunctionWithResult = <
	ConfectDataModel extends GenericConfectDataModel,
	ConvexValue extends DefaultFunctionArgs,
	ConfectValue,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>({
	databaseSchemas,
	args,
	success,
	error,
	handler,
}: {
	databaseSchemas: DatabaseSchemasFromConfectDataModel<ConfectDataModel>;
	args: Schema.Schema<ConfectValue, ConvexValue>;
	success: Schema.Schema<ConfectSuccess, ConvexSuccess>;
	error: Schema.Schema<ConfectError, ConvexError>;
	handler: (
		a: ConfectValue,
	) => Effect.Effect<
		ConfectSuccess,
		ConfectError,
		ConfectMutationCtx<ConfectDataModel>
	>;
}) => {
	const successSchema = Schema.Struct({
		_tag: Schema.Literal("Success"),
		data: success,
	});
	const resultSchema = Schema.Union(successSchema, error);

	return {
		args: compileArgsSchema(args),
		returns: compileReturnsSchema(resultSchema),
		handler: (
			ctx: GenericMutationCtx<DataModelFromConfectDataModel<ConfectDataModel>>,
			actualArgs: ConvexValue,
		): Promise<{ _tag: "Success"; data: ConvexSuccess } | ConvexError> =>
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
				Effect.map(
					(data): { _tag: "Success"; data: ConfectSuccess } | ConfectError => ({
						_tag: "Success",
						data,
					}),
				),
				Effect.catchAll((e: ConfectError) => Effect.succeed(e)),
				Effect.andThen((result) => Schema.encodeUnknown(resultSchema)(result)),
				Effect.runPromise,
			),
	};
};

const confectActionFunctionDirect = <
	ConfectDataModel extends GenericConfectDataModel,
	ConvexValue extends DefaultFunctionArgs,
	ConfectValue,
	ConvexReturns,
	ConfectReturns,
>({
	args,
	returns,
	handler,
}: {
	args: Schema.Schema<ConfectValue, ConvexValue>;
	returns: Schema.Schema<ConfectReturns, ConvexReturns>;
	handler: (
		a: ConfectValue,
	) => Effect.Effect<ConfectReturns, never, ConfectActionCtx<ConfectDataModel>>;
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
			Effect.andThen((result) => Schema.encode(returns)(result)),
			Effect.runPromise,
		),
});

const confectActionFunctionWithResult = <
	ConfectDataModel extends GenericConfectDataModel,
	ConvexValue extends DefaultFunctionArgs,
	ConfectValue,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>({
	args,
	success,
	error,
	handler,
}: {
	args: Schema.Schema<ConfectValue, ConvexValue>;
	success: Schema.Schema<ConfectSuccess, ConvexSuccess>;
	error: Schema.Schema<ConfectError, ConvexError>;
	handler: (
		a: ConfectValue,
	) => Effect.Effect<
		ConfectSuccess,
		ConfectError,
		ConfectActionCtx<ConfectDataModel>
	>;
}) => {
	const successSchema = Schema.Struct({
		_tag: Schema.Literal("Success"),
		data: success,
	});
	const resultSchema = Schema.Union(successSchema, error);

	return {
		args: compileArgsSchema(args),
		returns: compileReturnsSchema(resultSchema),
		handler: (
			ctx: GenericActionCtx<DataModelFromConfectDataModel<ConfectDataModel>>,
			actualArgs: ConvexValue,
		): Promise<{ _tag: "Success"; data: ConvexSuccess } | ConvexError> =>
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
				Effect.map(
					(data): { _tag: "Success"; data: ConfectSuccess } | ConfectError => ({
						_tag: "Success",
						data,
					}),
				),
				Effect.catchAll((e: ConfectError) => Effect.succeed(e)),
				Effect.andThen((result) => Schema.encodeUnknown(resultSchema)(result)),
				Effect.runPromise,
			),
	};
};
