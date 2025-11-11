import { Value } from "convex/values";

// Returns -1 if k1 < k2
// Returns 0 if k1 === k2
// Returns 1 if k1 > k2
export function compareValues(k1: Value | undefined, k2: Value | undefined) {
  return compareAsTuples(makeComparable(k1), makeComparable(k2));
}

function compareAsTuples<T>(a: [number, T], b: [number, T]): number {
  if (a[0] === b[0]) {
    return compareSameTypeValues(a[1], b[1]);
  } else if (a[0] < b[0]) {
    return -1;
  }
  return 1;
}

function compareSameTypeValues<T>(v1: T, v2: T): number {
  if (v1 === undefined || v1 === null) {
    return 0;
  }
  if (
    typeof v1 === "bigint" ||
    typeof v1 === "number" ||
    typeof v1 === "boolean" ||
    typeof v1 === "string"
  ) {
    return v1 < v2 ? -1 : v1 === v2 ? 0 : 1;
  }
  if (!Array.isArray(v1) || !Array.isArray(v2)) {
    throw new Error(`Unexpected type ${v1 as any}`);
  }
  for (let i = 0; i < v1.length && i < v2.length; i++) {
    const cmp = compareAsTuples(v1[i], v2[i]);
    if (cmp !== 0) {
      return cmp;
    }
  }
  if (v1.length < v2.length) {
    return -1;
  }
  if (v1.length > v2.length) {
    return 1;
  }
  return 0;
}

// Returns an array which can be compared to other arrays as if they were tuples.
// For example, [1, null] < [2, 1n] means null sorts before all bigints
// And [3, 5] < [3, 6] means floats sort as expected
// And [7, [[5, "a"]]] < [7, [[5, "a"], [5, "b"]]] means arrays sort as expected
function makeComparable(v: Value | undefined): [number, any] {
  if (v === undefined) {
    return [0, undefined];
  }
  if (v === null) {
    return [1, null];
  }
  if (typeof v === "bigint") {
    return [2, v];
  }
  if (typeof v === "number") {
    if (isNaN(v)) {
      // Consider all NaNs to be equal.
      return [3.5, 0];
    }
    return [3, v];
  }
  if (typeof v === "boolean") {
    return [4, v];
  }
  if (typeof v === "string") {
    return [5, v];
  }
  if (v instanceof ArrayBuffer) {
    return [6, Array.from(new Uint8Array(v)).map(makeComparable)];
  }
  if (Array.isArray(v)) {
    return [7, v.map(makeComparable)];
  }
  // Otherwise, it's an POJO.
  const keys = Object.keys(v).sort();
  const pojo: Value[] = keys.map((k) => [k, v[k]!]);
  return [8, pojo.map(makeComparable)];
}
