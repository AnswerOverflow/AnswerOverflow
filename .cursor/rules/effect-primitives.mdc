---
description: Prefer Effect primitives over standard JavaScript primitives whenever possible for better type safety, immutability, and functional programming patterns
globs: **/*.ts,**/*.tsx
---

# Effect Primitives Preference

Always prefer Effect's primitives over standard JavaScript primitives whenever possible. This provides better type safety, immutability, error handling, and composability.

## Important: Avoid Shadowing JavaScript Built-in Types

**Never import Effect modules that shadow JavaScript built-in types without aliasing.** Effect provides modules like `Array`, `Number`, `String`, `Boolean`, etc. that would shadow the global JavaScript types if imported directly.

### ❌ Avoid (Shadowing)

```typescript
import { Array, Number, String } from "effect";

// This shadows the global Array, Number, String types!
const items = Array.make(1, 2, 3);
```

### ✅ Prefer (Aliased Import)

```typescript
import { Array as Arr, Number as Num, String as Str } from "effect";

// Use aliased names to avoid shadowing
const items = Arr.make(1, 2, 3);
const sum = Num.sum(1, 2, 3);
```

## Data Structures

### Arrays

- **Prefer `Chunk<A>`** over `Array` when:
  - Performing repeated concatenation operations
  - Working with immutable collections
  - Need structural equality
- **Prefer `Data.array`** for immutable arrays with structural equality
- **Prefer `List<A>`** for linked list operations (efficient prepend/append)
- **When using Effect's `Array` module**, always use aliased imports (e.g., `import { Array as Arr }`) to avoid shadowing the global `Array` type
- **Prefer Effect's `Array` utilities** over standard JavaScript array methods when working with JavaScript arrays:
  - Use `Arr.filter(values, Predicate.isNotNullable)` instead of `values.filter(x => x != null)`
  - Use `Arr.map`, `Arr.filter`, `Arr.find`, etc. with Effect predicates and utilities for better type safety and composability
  - Always import with aliases: `import { Array as Arr, Predicate } from "effect"`
- **When filtering null values after map operations**, **ALWAYS** use `Arr.filter` with `Predicate.isNotNull` instead of manual `.map().filter()` patterns, **even in non-Effect code**:
  - ❌ Avoid: `items.map(x => x?.value ?? null).filter((x): x is NonNullable<typeof x> => x !== null)`
  - ✅ Prefer: `Arr.filter(Arr.map(items, x => x?.value ?? null), Predicate.isNotNull)`
  - This applies to **all code**, not just Effect-based code - use Effect primitives consistently throughout the codebase
  - This provides better type safety and cleaner code without manual type guards

### Maps & Sets

- **Prefer `HashMap<K, V>`** over `Map<K, V>` for immutable key-value pairs
- **Prefer `HashSet<A>`** over `Set<A>` for immutable unique collections
- **Prefer `SortedSet<A>`** when ordering matters
- Use mutable variants (`MutableHashMap`, `MutableHashSet`) only when performance is critical and mutation is localized

### Objects

- **Prefer `Data.struct`** over plain objects for immutable structs with structural equality
- **Prefer `Data.tagged`** for tagged unions/discriminated unions

## Control Flow

### Conditionals

- **Prefer `Effect.if`** for conditional Effect execution
- **Prefer `Match`** module over `switch` statements for pattern matching
- **Prefer `Option.match`, `Either.match`, `Exit.match`** for type-safe pattern matching

### Loops & Iteration

- **Prefer functional methods** (`map`, `filter`, `reduce`, `forEach`) over `for` loops
- **Prefer `Effect.forEach`** for async iteration over collections
- **Prefer `Stream`** over async iterables for lazy async sequences
- **Prefer `Effect.gen`** over `async/await` for Effect-based code

## Error Handling

### Null/Undefined

- **Prefer `Option<A>`** over `null` or `undefined`
- Use `Option.some(value)` and `Option.none` instead of nullable types

### Error Handling

- **Prefer `Either<L, R>`** over throwing errors
- **Prefer `Effect.try`** over try/catch blocks
- **Prefer `Effect.catch`, `Effect.catchAll`, `Effect.catchTag`** for error recovery
- **Prefer `Effect.orElse`, `Effect.orElseFail`** for fallback mechanisms

## Async Operations

### Promises

- **Prefer `Effect`** over `Promise` for async operations
- **Prefer `Effect.promise`** to convert Promises to Effects
- **Prefer `Effect.async`** for callback-based APIs
- **Prefer `Effect.gen`** over `async/await`

### Coordination

- **Prefer `Deferred<A>`** over manual Promise coordination
- **Prefer `Fiber<A>`** for cancellable async operations

## State Management

### Mutable State

- **Prefer `Ref<A>`** over mutable variables in concurrent code
- **Prefer `SynchronizedRef<A>`** for atomic effectful updates
- **Prefer `SubscriptionRef<A>`** for observable state

## Concurrency

### Communication

- **Prefer `Queue<A>`** over manual async queues
- **Prefer `PubSub<A>`** for publish-subscribe patterns
- **Prefer `Channel`** for bidirectional communication

### Coordination

- **Prefer `Semaphore`** for controlling concurrent access
- **Prefer `Latch`** for synchronization barriers
- **Prefer `Effect.all`, `Effect.race`, `Effect.zipPar`** for concurrent operations

## Time & Scheduling

### Time

- **Prefer `Duration`** over raw milliseconds/seconds
- **Prefer `DateTime`** over `Date` for time points
- **Prefer `Effect.delay`** over `setTimeout`

### Scheduling

- **Prefer `Schedule`** for retry/repeat patterns
- **Prefer `Effect.retry`** with `Schedule` over manual retry logic
- **Prefer `Effect.repeat`** with `Schedule` over manual loops

## Configuration

### Environment Variables

- **Prefer `Config<A>`** over direct `process.env` access
- Use `Config.string`, `Config.number`, `Config.boolean`, etc. for type-safe config
- Use `Config.secret`, `Config.redacted` for sensitive values
- Use `Config.withDefault`, `Config.orElse` for fallbacks

## Random Numbers

### Random Generation

- **Prefer `Random`** service over `Math.random()`
- Use `Random.nextInt`, `Random.nextBoolean`, `Random.choice`, etc.
- Use `Random.fixed` for deterministic testing

## Caching

### Memoization

- **Prefer `Cache<Key, Error, Value>`** over manual caching
- **Prefer `Effect.cached`, `Effect.cachedWithTTL`** for Effect memoization
- **Prefer `Effect.cachedFunction`** for function memoization
- **Prefer `Effect.once`** for one-time execution

## Resource Management

### Cleanup

- **Prefer `Scope`** for resource lifecycle management
- **Prefer `Effect.acquireUseRelease`** over manual try/finally
- **Prefer `Effect.ensuring`** for cleanup guarantees

## Logging

### Console Operations

- **Prefer `Console`** module (`Console.log`, `Console.error`, etc.) over direct `console` calls
- **Prefer `Logger`** service for structured logging
- **Prefer `LogLevel`** for log levels

## Number Operations

### Math

- **Prefer `Number`** module utilities (`Number.sum`, `Number.min`, `Number.max`, `Number.clamp`, etc.) for type-safe operations
- **Prefer `Number.parse`** over `parseInt`/`parseFloat` for safe parsing
- **Always use aliased imports** (e.g., `import { Number as Num }`) to avoid shadowing the global `Number` type

## BigInt Operations

### Comparisons & Ordering

- **Prefer `BigInt.Order`** (or `Order.bigint`) for comparing bigint values
- **Prefer `Order.mapInput`** with `BigInt.Order` when sorting by bigint fields (e.g., Discord snowflake IDs)
- **Prefer `Order.reverse`** with `BigInt.Order` for descending order sorts
- **Prefer `BigInt` module utilities** (`BigInt.greaterThan`, `BigInt.lessThan`, `BigInt.sum`, `BigInt.min`, `BigInt.max`, etc.) for type-safe bigint operations
- **Always use aliased imports** (e.g., `import { BigInt as BigIntEffect }`) to avoid shadowing the global `BigInt` type

### Examples

```typescript
import { BigInt as BigIntEffect, Order, Array as Arr } from "effect";

// Sorting by bigint ID (ascending)
const sorted = Arr.sort(
  items,
  Order.mapInput(BigIntEffect.Order, (item) => BigInt(item.id))
);

// Sorting by bigint ID (descending)
const sortedDesc = Arr.sort(
  items,
  Order.reverse(Order.mapInput(BigIntEffect.Order, (item) => BigInt(item.id)))
);

// Comparing bigints
const isGreater = BigIntEffect.greaterThan(value1, value2);
const sum = BigIntEffect.sum(value1, value2);
```

## Type Utilities

### Comparison & Ordering

- **Prefer `Order<A>`** for comparisons
- **Prefer `Equal<A>`** for equality checking
- **Prefer `Hash`** for hashing

## Exceptions

### When Standard JS is Acceptable

1. **Interoperability**: When interfacing with external libraries that require standard JS types
2. **Performance**: In performance-critical hot paths where Effect overhead is prohibitive (measure first)
3. **Simple cases**: For trivial, local operations where Effect primitives add unnecessary complexity
4. **Convex functions**: When working within Convex functions, follow Convex conventions first

**Note**: Filtering null values with `Arr.filter` and `Predicate.isNotNull` is **NOT** an exception - this pattern should **always** be used, even in non-Effect code, as it provides better type safety and cleaner code without performance overhead.

### Migration Strategy

- Start with new code: Use Effect primitives in all new code
- Gradually migrate: Refactor existing code to use Effect primitives when making changes
- Don't force: Don't rewrite working code just for the sake of using Effect primitives

## Examples

### ❌ Avoid

```typescript
const items: Array<number> = [1, 2, 3];
const doubled = items.map((x) => x * 2);

const values: Array<string | null | undefined> = ["a", null, "b", undefined, "c"];
const filtered = values.filter((x) => x != null);

const threadsWithMessages = sortedThreads
  .map((thread) => {
    const message = firstMessages[thread.id];
    if (!message) return null;
    return { thread, message };
  })
  .filter((tm): tm is { thread: typeof tm.thread; message: NonNullable<typeof tm.message> } => tm !== null);

const map = new Map<string, number>();
map.set("key", 1);

try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  throw new Error("Failed");
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
```

### ✅ Prefer

```typescript
import { Chunk, HashMap, Effect, Duration, Order } from "effect";
import { Array as Arr, Number as Num, BigInt as BigIntEffect, Predicate } from "effect";

const items = Chunk.make(1, 2, 3);
const doubled = Chunk.map(items, (x) => x * 2);

// Using Effect's Array module with aliased import
const jsArray = [1, 2, 3];
const mapped = Arr.map(jsArray, (x) => x * 2);

// Filtering with Effect predicates
const values: Array<string | null | undefined> = ["a", null, "b", undefined, "c"];
const filtered = Arr.filter(values, Predicate.isNotNullable);

// Filtering null values after map operations
const threadsWithMessages = Arr.filter(
  Arr.map(sortedThreads, (thread) => {
    const message = firstMessages[thread.id];
    if (!message) return null;
    return { thread, message };
  }),
  Predicate.isNotNull,
);

// Using Effect's Number module with aliased import
const sum = Num.sum(1, 2, 3);

// Using Effect's BigInt module with aliased import
const sortedByBigIntId = Arr.sort(
  items,
  Order.mapInput(BigIntEffect.Order, (item) => BigInt(item.id))
);

const map = HashMap.make(["key", 1] as const);

const result = Effect.tryPromise({
  try: () => someAsyncOperation(),
  catch: (error) => new Error("Failed"),
});

const delay = (duration: Duration.Duration) => Effect.delay(duration);
```
