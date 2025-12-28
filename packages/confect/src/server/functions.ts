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

	function query<
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
	}): RegisteredQuery<"public", ConvexArgs, Promise<ConvexReturns>>;
	function query<
		ConvexArgs extends DefaultFunctionArgs,
		ConfectArgs,
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
		args: Schema.Schema<ConfectArgs, ConvexArgs>;
		success: Schema.Schema<ConfectSuccess, ConvexSuccess>;
		error: Schema.Schema<ConfectError, ConvexError>;
		handler: (
			a: ConfectArgs,
		) => Effect.Effect<
			ConfectSuccess,
			ConfectError,
			ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredQuery<
		"public",
		ConvexArgs,
		Promise<{ _tag: "Success"; data: ConvexSuccess } | ConvexError>
	>;
	function query(opts: {
		args: Schema.Schema<unknown, DefaultFunctionArgs>;
		returns?: Schema.Schema<unknown, unknown>;
		success?: Schema.Schema<unknown, unknown>;
		error?: Schema.Schema<{ readonly _tag: string }, unknown>;
		handler: (
			a: unknown,
		) => Effect.Effect<
			unknown,
			unknown,
			ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}) {
		if (opts.success && opts.error) {
			return queryGeneric(
				confectQueryFunctionWithResult({
					databaseSchemas,
					args: opts.args,
					success: opts.success,
					error: opts.error,
					handler: opts.handler as (
						a: unknown,
					) => Effect.Effect<
						unknown,
						{ readonly _tag: string },
						ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>,
				}),
			);
		}
		return queryGeneric(
			confectQueryFunction({
				databaseSchemas,
				args: opts.args,
				returns: opts.returns!,
				handler: opts.handler,
			}),
		);
	}

	function internalQuery<
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
	}): RegisteredQuery<"internal", ConvexArgs, Promise<ConvexReturns>>;
	function internalQuery<
		ConvexArgs extends DefaultFunctionArgs,
		ConfectArgs,
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
		args: Schema.Schema<ConfectArgs, ConvexArgs>;
		success: Schema.Schema<ConfectSuccess, ConvexSuccess>;
		error: Schema.Schema<ConfectError, ConvexError>;
		handler: (
			a: ConfectArgs,
		) => Effect.Effect<
			ConfectSuccess,
			ConfectError,
			ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredQuery<
		"internal",
		ConvexArgs,
		Promise<{ _tag: "Success"; data: ConvexSuccess } | ConvexError>
	>;
	function internalQuery(opts: {
		args: Schema.Schema<unknown, DefaultFunctionArgs>;
		returns?: Schema.Schema<unknown, unknown>;
		success?: Schema.Schema<unknown, unknown>;
		error?: Schema.Schema<{ readonly _tag: string }, unknown>;
		handler: (
			a: unknown,
		) => Effect.Effect<
			unknown,
			unknown,
			ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}) {
		if (opts.success && opts.error) {
			return internalQueryGeneric(
				confectQueryFunctionWithResult({
					databaseSchemas,
					args: opts.args,
					success: opts.success,
					error: opts.error,
					handler: opts.handler as (
						a: unknown,
					) => Effect.Effect<
						unknown,
						{ readonly _tag: string },
						ConfectQueryCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>,
				}),
			);
		}
		return internalQueryGeneric(
			confectQueryFunction({
				databaseSchemas,
				args: opts.args,
				returns: opts.returns!,
				handler: opts.handler,
			}),
		);
	}

	function mutation<
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
	}): RegisteredMutation<"public", ConvexValue, Promise<ConvexReturns>>;
	function mutation<
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
			ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredMutation<
		"public",
		ConvexValue,
		Promise<{ _tag: "Success"; data: ConvexSuccess } | ConvexError>
	>;
	function mutation(opts: {
		args: Schema.Schema<unknown, DefaultFunctionArgs>;
		returns?: Schema.Schema<unknown, unknown>;
		success?: Schema.Schema<unknown, unknown>;
		error?: Schema.Schema<{ readonly _tag: string }, unknown>;
		handler: (
			a: unknown,
		) => Effect.Effect<
			unknown,
			unknown,
			ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}) {
		if (opts.success && opts.error) {
			return mutationBuilder(
				confectMutationFunctionWithResult({
					databaseSchemas,
					args: opts.args,
					success: opts.success,
					error: opts.error,
					handler: opts.handler as (
						a: unknown,
					) => Effect.Effect<
						unknown,
						{ readonly _tag: string },
						ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>,
				}),
			);
		}
		return mutationBuilder(
			confectMutationFunction({
				databaseSchemas,
				args: opts.args,
				returns: opts.returns!,
				handler: opts.handler,
			}),
		);
	}

	function internalMutation<
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
	}): RegisteredMutation<"internal", ConvexValue, Promise<ConvexReturns>>;
	function internalMutation<
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
			ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredMutation<
		"internal",
		ConvexValue,
		Promise<{ _tag: "Success"; data: ConvexSuccess } | ConvexError>
	>;
	function internalMutation(opts: {
		args: Schema.Schema<unknown, DefaultFunctionArgs>;
		returns?: Schema.Schema<unknown, unknown>;
		success?: Schema.Schema<unknown, unknown>;
		error?: Schema.Schema<{ readonly _tag: string }, unknown>;
		handler: (
			a: unknown,
		) => Effect.Effect<
			unknown,
			unknown,
			ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}) {
		if (opts.success && opts.error) {
			return internalMutationBuilder(
				confectMutationFunctionWithResult({
					databaseSchemas,
					args: opts.args,
					success: opts.success,
					error: opts.error,
					handler: opts.handler as (
						a: unknown,
					) => Effect.Effect<
						unknown,
						{ readonly _tag: string },
						ConfectMutationCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
					>,
				}),
			);
		}
		return internalMutationBuilder(
			confectMutationFunction({
				databaseSchemas,
				args: opts.args,
				returns: opts.returns!,
				handler: opts.handler,
			}),
		);
	}

	const action = <
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
			ConfectActionCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredAction<
		"public",
		ConvexValue,
		Promise<{ _tag: "Success"; data: ConvexSuccess } | ConvexError>
	> => actionGeneric(confectActionFunction({ args, success, error, handler }));

	const internalAction = <
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
			ConfectActionCtx<ConfectDataModelFromConfectSchema<ConfectSchema>>
		>;
	}): RegisteredAction<
		"internal",
		ConvexValue,
		Promise<{ _tag: "Success"; data: ConvexSuccess } | ConvexError>
	> =>
		internalActionGeneric(
			confectActionFunction({ args, success, error, handler }),
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

const confectActionFunction = <
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
