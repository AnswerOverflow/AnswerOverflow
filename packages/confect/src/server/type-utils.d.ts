import type { GenericId } from "convex/values";
import type { Brand } from "effect";

export type IsOptional<T, K extends keyof T> = {} extends Pick<T, K>
	? true
	: false;

export type IsAny<T> = 0 extends 1 & T ? true : false;

export type IsUnion<T, U extends T = T> = T extends unknown
	? [U] extends [T]
		? false
		: true
	: never;

// https://stackoverflow.com/a/52806744
export type IsValueLiteral<Vl> = [Vl] extends [never]
	? never
	: [Vl] extends [string | number | bigint | boolean]
		? [string] extends [Vl]
			? false
			: [number] extends [Vl]
				? false
				: [boolean] extends [Vl]
					? false
					: [bigint] extends [Vl]
						? false
						: true
		: false;

export type DeepMutable<T> = IsAny<T> extends true
	? any
	: T extends Brand.Brand<any> | GenericId<any>
		? T
		: T extends ReadonlyArray<infer U>
			? DeepMutable<U>[]
			: T extends ReadonlyMap<infer K, infer V>
				? Map<DeepMutable<K>, DeepMutable<V>>
				: T extends ReadonlySet<infer V>
					? Set<DeepMutable<V>>
					: [keyof T] extends [never]
						? T
						: { -readonly [K in keyof T]: DeepMutable<T[K]> };

export type DeepReadonly<T> = IsAny<T> extends true
	? any
	: T extends Map<infer K, infer V>
		? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
		: T extends Set<infer V>
			? ReadonlySet<DeepReadonly<V>>
			: [keyof T] extends [never]
				? T
				: { readonly [K in keyof T]: DeepReadonly<T[K]> };

export type TypeError<Message extends string, T = never> = [Message, T];

export type IsRecursive<T> = true extends DetectCycle<T, [], 0> ? true : false;

type MaxDepth = 10;
type Increment<N extends number> = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11][N];

type DetectCycle<
	T,
	Cache extends any[] = [],
	Depth extends number = 0,
> = Depth extends MaxDepth
	? false
	: IsAny<T> extends true
		? false
		: [T] extends [any]
			? T extends Cache[number]
				? true
				: T extends Array<infer U>
					? DetectCycle<U, [...Cache, T], Increment<Depth>>
					: T extends Map<infer _U, infer V>
						? DetectCycle<V, [...Cache, T], Increment<Depth>>
						: T extends Set<infer U>
							? DetectCycle<U, [...Cache, T], Increment<Depth>>
							: T extends object
								? true extends {
										[K in keyof T]: DetectCycle<
											T[K],
											[...Cache, T],
											Increment<Depth>
										>;
									}[keyof T]
									? true
									: false
								: false
			: never;

//////////////////////////////////
// START: Vendored from Arktype //
//////////////////////////////////

// https://github.com/arktypeio/arktype/blob/2e911d01a741ccee7a17e31ee144049817fabbb8/ark/util/unionToTuple.ts#L9

export type UnionToTuple<t> = _unionToTuple<t, []> extends infer result
	? conform<result, t[]>
	: never;

type _unionToTuple<
	t,
	result extends unknown[],
> = getLastBranch<t> extends infer current
	? [t] extends [never]
		? result
		: _unionToTuple<Exclude<t, current>, [current, ...result]>
	: never;

type getLastBranch<t> = intersectUnion<
	t extends unknown ? (x: t) => void : never
> extends (x: infer branch) => void
	? branch
	: never;

type intersectUnion<t> = (t extends unknown ? (_: t) => void : never) extends (
	_: infer intersection,
) => void
	? intersection
	: never;

type conform<t, base> = t extends base ? t : base;

////////////////////////////////
// END: Vendored from Arktype //
////////////////////////////////
