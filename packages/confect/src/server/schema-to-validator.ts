import type {
	GenericId,
	OptionalProperty,
	PropertyValidators,
	VAny,
	VArray,
	Validator,
	VBoolean,
	VBytes,
	VFloat64,
	VId,
	VInt64,
	VLiteral,
	VNull,
	VObject,
	VOptional,
	VString,
	VUnion,
} from "convex/values";
import { v } from "convex/values";
import {
	Array,
	Cause,
	Data,
	Effect,
	Exit,
	Match,
	Number,
	Option,
	type ParseResult,
	pipe,
	Schema,
	SchemaAST,
	String,
} from "effect";
import { not } from "effect/Predicate";

import * as Id from "./schemas/Id";
import type {
	DeepMutable,
	IsAny,
	IsOptional,
	IsRecursive,
	IsUnion,
	IsValueLiteral,
	TypeError,
	UnionToTuple,
} from "./type-utils";

type JoinFieldPaths<
	Prefix extends string,
	Suffix extends string,
> = Suffix extends "" ? Prefix : `${Prefix}.${Suffix}`;

// Args

export const compileArgsSchema = <ConfectValue, ConvexValue>(
	argsSchema: Schema.Schema<ConfectValue, ConvexValue>,
): PropertyValidators => {
	const ast = Schema.encodedSchema(argsSchema).ast;

	return pipe(
		ast,
		Match.value,
		Match.tag("TypeLiteral", (typeLiteralAst) =>
			Array.isEmptyReadonlyArray(typeLiteralAst.indexSignatures)
				? handlePropertySignatures(typeLiteralAst)
				: Effect.fail(new IndexSignaturesAreNotSupportedError()),
		),
		Match.orElse(() => Effect.fail(new TopLevelMustBeObjectError())),
		runSyncThrow,
	);
};

// Returns

export const compileReturnsSchema = <ConfectValue, ConvexValue>(
	schema: Schema.Schema<ConfectValue, ConvexValue>,
): Validator<any, any, any> =>
	runSyncThrow(compileAst(Schema.encodedSchema(schema).ast));

// Table

type SchemaEncodedFieldPaths<TableSchema extends Schema.Schema.AnyNoContext> =
	TableSchema["Encoded"] extends infer E
		? E extends ReadonlyRecordValue
			? TopLevelFieldPaths<E>
			: keyof TableSchema["Encoded"] & string
		: keyof TableSchema["Encoded"] & string;

/**
 * Convert a table `Schema` to a table `Validator`.
 * Falls back to a permissive VObject if the type is too complex.
 */
export type TableSchemaToTableValidator<
	TableSchema extends Schema.Schema.AnyNoContext,
> = ValueToValidator<TableSchema["Encoded"]> extends infer Vd
	? Vd extends VObject<any, any, any, any> | VUnion<any, any, any, any>
		? Vd
		: VObject<
				TableSchema["Encoded"],
				Record<string, Validator<any, any, any>>,
				"required",
				SchemaEncodedFieldPaths<TableSchema>
			>
	: VObject<
			TableSchema["Encoded"],
			Record<string, Validator<any, any, any>>,
			"required",
			SchemaEncodedFieldPaths<TableSchema>
		>;

export const compileTableSchema = <
	TableSchema extends Schema.Schema.AnyNoContext,
>(
	schema: TableSchema,
): TableSchemaToTableValidator<TableSchema> => {
	const ast = Schema.encodedSchema(schema).ast;

	return pipe(
		ast,
		Match.value,
		Match.tag("TypeLiteral", ({ indexSignatures }) =>
			Array.isEmptyReadonlyArray(indexSignatures)
				? (compileAst(ast) as Effect.Effect<any>)
				: Effect.fail(new IndexSignaturesAreNotSupportedError()),
		),
		Match.tag("Union", (unionAst) => compileAst(unionAst)),
		Match.orElse(() => Effect.fail(new TopLevelMustBeObjectOrUnionError())),
		runSyncThrow,
	);
};

// Compiler

export type ReadonlyValue =
	| string
	| number
	| bigint
	| boolean
	| ArrayBuffer
	| ReadonlyArrayValue
	| ReadonlyRecordValue
	| null;

type ReadonlyArrayValue = readonly ReadonlyValue[];

export type ReadonlyRecordValue = {
	readonly [key: string]: ReadonlyValue | undefined;
};

type MaxTypeDepth = 6;
type IncrementDepth<N extends number> = [1, 2, 3, 4, 5, 6, 7][N];

type CountKeys<T> = keyof T extends never
	? 0
	: keyof T extends string
		? (keyof T)["length"] extends number
			? 1
			: 20
		: 20;
type IsTooComplex<T> = T extends ReadonlyRecordValue
	? CountKeys<T> extends infer N extends number
		? N extends 20
			? true
			: false
		: false
	: false;

export type ValueToValidator<
	Vl,
	Depth extends number = 0,
> = Depth extends MaxTypeDepth
	? VAny
	: IsRecursive<Vl> extends true
		? VAny
		: [Vl] extends [never]
			? never
			: IsAny<Vl> extends true
				? VAny
				: [Vl] extends [ReadonlyValue]
					? Vl extends {
							__tableName: infer TableName extends string;
						}
						? VId<GenericId<TableName>>
						: IsValueLiteral<Vl> extends true
							? VLiteral<Vl>
							: Vl extends null
								? VNull
								: Vl extends number
									? VFloat64
									: Vl extends bigint
										? VInt64
										: Vl extends boolean
											? VBoolean
											: Vl extends string
												? VString
												: Vl extends ArrayBuffer
													? VBytes
													: Vl extends ReadonlyArray<ReadonlyValue>
														? ArrayValueToValidator<Vl, Depth>
														: Vl extends ReadonlyRecordValue
															? RecordValueToValidator<Vl, Depth>
															: IsUnion<Vl> extends true
																? UnionValueToValidator<Vl, Depth>
																: TypeError<"Unexpected value", Vl>
					: TypeError<"Not a valid Convex value", Vl>;

type ArrayValueToValidator<
	Vl extends ReadonlyArray<ReadonlyValue>,
	Depth extends number = 0,
> = Depth extends MaxTypeDepth
	? VArray<any, VAny>
	: Vl extends ReadonlyArray<infer El extends ReadonlyValue>
		? ValueToValidator<El, IncrementDepth<Depth>> extends infer Vd extends
				Validator<any, any, any>
			? VArray<DeepMutable<El[]>, Vd>
			: VArray<any, VAny>
		: VArray<any, VAny>;

type ExtractFieldPathsFromValue<
	Vl,
	Prefix extends string = "",
	Depth extends number = 0,
> = Depth extends 4
	? Prefix
	: Vl extends ReadonlyRecordValue
		? {
				[K in keyof Vl & string]:
					| JoinFieldPaths<Prefix, K>
					| ExtractFieldPathsFromValue<
							NonNullable<Vl[K]>,
							JoinFieldPaths<Prefix, K>,
							IncrementDepth<Depth>
					  >;
			}[keyof Vl & string]
		: Prefix;

type TopLevelFieldPaths<Vl extends ReadonlyRecordValue> = {
	[K in keyof Vl & string]:
		| K
		| (NonNullable<Vl[K]> extends ReadonlyRecordValue
				? `${K}.${keyof NonNullable<Vl[K]> & string}`
				: never);
}[keyof Vl & string];

type RecordValueToValidator<
	Vl,
	Depth extends number = 0,
> = Depth extends MaxTypeDepth
	? VObject<any, any>
	: Vl extends ReadonlyRecordValue
		? RecordValueToValidatorInner<Vl, Depth>
		: never;

type SimpleFieldPaths<Vl extends ReadonlyRecordValue> = keyof Vl & string;

type RecordValueToValidatorInner<
	Vl extends ReadonlyRecordValue,
	Depth extends number,
> = {
	-readonly [K in keyof Vl]-?: IsAny<Vl[K]> extends true
		? IsOptional<Vl, K> extends true
			? VOptional<VAny>
			: VAny
		: UndefinedOrValueToValidator<Vl[K], Depth>;
} extends infer VdRecord extends Record<string, any>
	? {
			-readonly [K in keyof Vl]: DeepMutable<Vl[K]>;
		} extends infer VlRecord extends Record<string, any>
		? VObject<VlRecord, VdRecord, "required", SimpleFieldPaths<Vl>>
		: VObject<any, any>
	: VObject<any, any>;

export type UndefinedOrValueToValidator<
	Vl extends ReadonlyValue | undefined,
	Depth extends number = 0,
> = Depth extends MaxTypeDepth
	? VOptional<VAny>
	: undefined extends Vl
		? Vl extends infer Val extends ReadonlyValue | undefined
			? ValueToValidator<Val, IncrementDepth<Depth>> extends infer Vd extends
					Validator<any, OptionalProperty, any>
				? VOptional<Vd>
				: VOptional<VAny>
			: VOptional<VAny>
		: Vl extends ReadonlyValue
			? ValueToValidator<Vl, IncrementDepth<Depth>>
			: VAny;

type UnionValueToValidator<
	Vl extends ReadonlyValue,
	Depth extends number = 0,
> = Depth extends MaxTypeDepth
	? VAny
	: [Vl] extends [ReadonlyValue]
		? IsUnion<Vl> extends true
			? UnionToTuple<Vl> extends infer VlTuple extends
					ReadonlyArray<ReadonlyValue>
				? ValueTupleToValidatorTuple<
						VlTuple,
						Depth
					> extends infer VdTuple extends Validator<any, "required", any>[]
					? VUnion<DeepMutable<Vl>, VdTuple>
					: TypeError<"Failed to convert value tuple to validator tuple">
				: TypeError<"Failed to convert union to tuple">
			: TypeError<"Expected a union of values, but got a single value instead">
		: TypeError<"Provided value is not a valid Convex value">;

type ValueTupleToValidatorTuple<
	VlTuple extends ReadonlyArray<ReadonlyValue>,
	Depth extends number = 0,
> = Depth extends MaxTypeDepth
	? []
	: VlTuple extends
				| [true, false, ...infer VlRest extends ReadonlyArray<ReadonlyValue>]
				| [false, true, ...infer VlRest extends ReadonlyArray<ReadonlyValue>]
		? ValueTupleToValidatorTuple<
				VlRest,
				IncrementDepth<Depth>
			> extends infer VdRest extends Validator<any, any, any>[]
			? [VBoolean<boolean>, ...VdRest]
			: never
		: VlTuple extends [
					infer Vl extends ReadonlyValue,
					...infer VlRest extends ReadonlyArray<ReadonlyValue>,
				]
			? ValueToValidator<Vl, IncrementDepth<Depth>> extends infer Vd extends
					Validator<any, any, any>
				? ValueTupleToValidatorTuple<
						VlRest,
						IncrementDepth<Depth>
					> extends infer VdRest extends Validator<any, "required", any>[]
					? [Vd, ...VdRest]
					: never
				: never
			: [];

export const compileSchema = <T, E>(
	schema: Schema.Schema<T, E>,
): ValueToValidator<(typeof schema)["Encoded"]> =>
	runSyncThrow(compileAst(schema.ast)) as any;

export const isRecursive = (ast: SchemaAST.AST): boolean =>
	pipe(
		ast,
		Match.value,
		Match.tag(
			"Literal",
			"BooleanKeyword",
			"StringKeyword",
			"NumberKeyword",
			"BigIntKeyword",
			"UnknownKeyword",
			"AnyKeyword",
			"Declaration",
			"UniqueSymbol",
			"SymbolKeyword",
			"UndefinedKeyword",
			"VoidKeyword",
			"NeverKeyword",
			"Enums",
			"TemplateLiteral",
			"ObjectKeyword",
			"Transformation",
			() => false,
		),
		Match.tag("Union", ({ types }) =>
			Array.some(types, (type) => isRecursive(type)),
		),
		Match.tag("TypeLiteral", ({ propertySignatures }) =>
			Array.some(propertySignatures, ({ type }) => isRecursive(type)),
		),
		Match.tag(
			"TupleType",
			({ elements: optionalElements, rest: elements }) =>
				Array.some(optionalElements, (optionalElement) =>
					isRecursive(optionalElement.type),
				) || Array.some(elements, (element) => isRecursive(element.type)),
		),
		Match.tag("Refinement", ({ from }) => isRecursive(from)),
		Match.tag("Suspend", () => true),
		Match.exhaustive,
	);

export const compileAst = (
	ast: SchemaAST.AST,
	isOptionalPropertyOfTypeLiteral = false,
): Effect.Effect<
	Validator<any, any, any>,
	| UnsupportedSchemaTypeError
	| UnsupportedPropertySignatureKeyTypeError
	| IndexSignaturesAreNotSupportedError
	| OptionalTupleElementsAreNotSupportedError
	| EmptyTupleIsNotSupportedError
> =>
	isRecursive(ast)
		? Effect.succeed(v.any())
		: pipe(
				ast,
				Match.value,
				Match.tag("Literal", ({ literal }) =>
					pipe(
						literal,
						Match.value,
						Match.whenOr(
							Match.string,
							Match.number,
							Match.bigint,
							Match.boolean,
							(l) => v.literal(l),
						),
						Match.when(Match.null, () => v.null()),
						Match.exhaustive,
						Effect.succeed,
					),
				),
				Match.tag("BooleanKeyword", () => Effect.succeed(v.boolean())),
				Match.tag("StringKeyword", (stringAst) =>
					Id.tableName(stringAst).pipe(
						Option.match({
							onNone: () => Effect.succeed(v.string()),
							onSome: (tableName) => Effect.succeed(v.id(tableName)),
						}),
					),
				),
				Match.tag("NumberKeyword", () => Effect.succeed(v.float64())),
				Match.tag("BigIntKeyword", () => Effect.succeed(v.int64())),
				Match.tag("Union", (unionAst) =>
					handleUnion(unionAst, isOptionalPropertyOfTypeLiteral),
				),
				Match.tag("TypeLiteral", (typeLiteralAst) =>
					handleTypeLiteral(typeLiteralAst),
				),
				Match.tag("TupleType", (tupleTypeAst) => handleTupleType(tupleTypeAst)),
				Match.tag("UnknownKeyword", "AnyKeyword", () =>
					Effect.succeed(v.any()),
				),
				Match.tag("Declaration", (declaration) =>
					Effect.mapBoth(
						declaration.decodeUnknown(...declaration.typeParameters)(
							new ArrayBuffer(0),
							{},
							declaration,
						) as Effect.Effect<ArrayBuffer, ParseResult.ParseIssue>,
						{
							onSuccess: () => v.bytes(),
							onFailure: () =>
								new UnsupportedSchemaTypeError({
									schemaType: declaration._tag,
								}),
						},
					),
				),
				Match.tag("Refinement", ({ from }) => compileAst(from)),
				/* v8 ignore next -- @preserve */
				Match.tag("Suspend", () =>
					Effect.dieMessage(
						"Suspended schema should have already been handled by recursion check; this should be impossible.",
					),
				),
				Match.tag(
					"UniqueSymbol",
					"SymbolKeyword",
					"UndefinedKeyword",
					"VoidKeyword",
					"NeverKeyword",
					"Enums",
					"TemplateLiteral",
					"ObjectKeyword",
					"Transformation",
					() =>
						Effect.fail(
							new UnsupportedSchemaTypeError({
								schemaType: ast._tag,
							}),
						),
				),
				Match.exhaustive,
			);

const handleUnion = (
	{ types: [first, second, ...rest] }: SchemaAST.Union,
	isOptionalPropertyOfTypeLiteral: boolean,
) =>
	Effect.gen(function* () {
		const validatorEffects = isOptionalPropertyOfTypeLiteral
			? Array.filterMap([first, second, ...rest], (type) =>
					not(SchemaAST.isUndefinedKeyword)(type)
						? Option.some(compileAst(type))
						: Option.none(),
				)
			: Array.map([first, second, ...rest], (type) => compileAst(type));

		/* v8 ignore next -- @preserve */
		const [firstValidator, secondValidator, ...restValidators] =
			yield* Effect.all(validatorEffects);

		/* v8 ignore if -- @preserve */
		if (firstValidator === undefined) {
			return yield* Effect.dieMessage(
				"First validator of union is undefined; this should be impossible.",
			);
		} else if (secondValidator === undefined) {
			return firstValidator;
		} else {
			return v.union(firstValidator, secondValidator, ...restValidators);
		}
	});

const handleTypeLiteral = (typeLiteralAst: SchemaAST.TypeLiteral) =>
	pipe(
		typeLiteralAst.indexSignatures,
		Array.head,
		Option.match({
			onNone: () =>
				pipe(handlePropertySignatures(typeLiteralAst), Effect.map(v.object)),
			/* v8 ignore next -- @preserve */
			onSome: () => Effect.fail(new IndexSignaturesAreNotSupportedError()),
		}),
	);

const handleTupleType = ({ elements, rest }: SchemaAST.TupleType) =>
	Effect.gen(function* () {
		const restValidator = pipe(
			rest,
			Array.head,
			Option.map(({ type }) => compileAst(type)),
			Effect.flatten,
		);

		const [f, s, ...r] = elements;

		const elementToValidator = ({ type, isOptional }: SchemaAST.OptionalType) =>
			Effect.if(isOptional, {
				onTrue: () =>
					Effect.fail(new OptionalTupleElementsAreNotSupportedError()),
				onFalse: () => compileAst(type),
			});

		const arrayItemsValidator = yield* f === undefined
			? pipe(
					restValidator,
					Effect.catchTag("NoSuchElementException", () =>
						Effect.fail(new EmptyTupleIsNotSupportedError()),
					),
				)
			: s === undefined
				? elementToValidator(f)
				: Effect.gen(function* () {
						const firstValidator = yield* elementToValidator(f);
						const secondValidator = yield* elementToValidator(s);
						const restValidators = yield* Effect.forEach(r, elementToValidator);

						return v.union(firstValidator, secondValidator, ...restValidators);
					});

		return v.array(arrayItemsValidator);
	});

const handlePropertySignatures = (typeLiteralAst: SchemaAST.TypeLiteral) =>
	pipe(
		typeLiteralAst.propertySignatures,
		// biome-ignore lint/suspicious: False positive.
		Effect.forEach(({ type, name, isOptional }) => {
			if (String.isString(name)) {
				// Somehow, somewhere, keys of type number are being coerced to strings…
				return Option.match(Number.parse(name), {
					onNone: () =>
						Effect.gen(function* () {
							const validator = yield* compileAst(type, isOptional);

							return {
								propertyName: name,
								validator: isOptional ? v.optional(validator) : validator,
							};
						}),
					onSome: (number) =>
						Effect.fail(
							new UnsupportedPropertySignatureKeyTypeError({
								propertyKey: number,
							}),
						),
				});
			} else {
				return Effect.fail(
					new UnsupportedPropertySignatureKeyTypeError({ propertyKey: name }),
				);
			}
		}),
		Effect.andThen((propertyNamesWithValidators) =>
			pipe(
				propertyNamesWithValidators,
				Array.reduce(
					{} as Record<string, Validator<any, any, any>>,
					(acc, { propertyName, validator }) => ({
						[propertyName]: validator,
						...acc,
					}),
				),
				Effect.succeed,
			),
		),
	);

// Errors

const runSyncThrow = <A, E>(effect: Effect.Effect<A, E>) =>
	pipe(
		effect,
		Effect.runSyncExit,
		Exit.match({
			onSuccess: (validator) => validator,
			onFailure: (cause) => {
				throw Cause.squash(cause);
			},
		}),
	);

export class TopLevelMustBeObjectError extends Data.TaggedError(
	"TopLevelMustBeObjectError",
) {
	/* v8 ignore next -- @preserve */
	override get message() {
		return "Top level schema must be an object";
	}
}

export class TopLevelMustBeObjectOrUnionError extends Data.TaggedError(
	"TopLevelMustBeObjectOrUnionError",
) {
	/* v8 ignore next -- @preserve */
	override get message() {
		return "Top level schema must be an object or a union";
	}
}

export class UnsupportedPropertySignatureKeyTypeError extends Data.TaggedError(
	"UnsupportedPropertySignatureKeyTypeError",
)<{
	readonly propertyKey: number | symbol;
}> {
	/* v8 ignore next -- @preserve */
	override get message() {
		return `Unsupported property signature '${this.propertyKey.toString()}'. Property is of type '${typeof this
			.propertyKey}' but only 'string' properties are supported.`;
	}
}

export class EmptyTupleIsNotSupportedError extends Data.TaggedError(
	"EmptyTupleIsNotSupportedError",
) {
	/* v8 ignore next -- @preserve */
	override get message() {
		return "Tuple must have at least one element";
	}
}

export class UnsupportedSchemaTypeError extends Data.TaggedError(
	"UnsupportedSchemaTypeError",
)<{
	readonly schemaType: SchemaAST.AST["_tag"];
}> {
	/* v8 ignore next -- @preserve */
	override get message() {
		return `Unsupported schema type '${this.schemaType}'`;
	}
}

export class IndexSignaturesAreNotSupportedError extends Data.TaggedError(
	"IndexSignaturesAreNotSupportedError",
) {
	/* v8 ignore next -- @preserve */
	override get message() {
		return "Index signatures are not supported";
	}
}

export class OptionalTupleElementsAreNotSupportedError extends Data.TaggedError(
	"OptionalTupleElementsAreNotSupportedError",
) {
	/* v8 ignore next -- @preserve */
	override get message() {
		return "Optional tuple elements are not supported";
	}
}
