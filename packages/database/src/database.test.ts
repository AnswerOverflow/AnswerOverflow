import { describe, expect, it } from "vitest";

function sortObjectKeys(obj: unknown): unknown {
	if (obj === null || typeof obj !== "object") {
		return obj;
	}
	if (Array.isArray(obj)) {
		return obj.map(sortObjectKeys);
	}
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(obj).sort()) {
		sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
	}
	return sorted;
}

function createQueryCacheKey(
	functionPath: string,
	args: Record<string, unknown>,
): string {
	return JSON.stringify({ args: sortObjectKeys(args), functionPath });
}

describe("createQueryCacheKey", () => {
	it("should create consistent keys regardless of object key order", () => {
		const key1 = createQueryCacheKey("test.query", { a: 1, b: 2, c: 3 });
		const key2 = createQueryCacheKey("test.query", { c: 3, a: 1, b: 2 });
		const key3 = createQueryCacheKey("test.query", { b: 2, c: 3, a: 1 });

		expect(key1).toBe(key2);
		expect(key2).toBe(key3);
	});

	it("should create different keys for different function paths", () => {
		const key1 = createQueryCacheKey("test.query1", { a: 1 });
		const key2 = createQueryCacheKey("test.query2", { a: 1 });

		expect(key1).not.toBe(key2);
	});

	it("should create different keys for different args", () => {
		const key1 = createQueryCacheKey("test.query", { a: 1 });
		const key2 = createQueryCacheKey("test.query", { a: 2 });

		expect(key1).not.toBe(key2);
	});

	it("should handle nested objects with consistent key ordering", () => {
		const key1 = createQueryCacheKey("test.query", {
			outer: { b: 2, a: 1 },
			z: "last",
		});
		const key2 = createQueryCacheKey("test.query", {
			z: "last",
			outer: { a: 1, b: 2 },
		});

		expect(key1).toBe(key2);
	});

	it("should handle arrays correctly", () => {
		const key1 = createQueryCacheKey("test.query", { items: [1, 2, 3] });
		const key2 = createQueryCacheKey("test.query", { items: [1, 2, 3] });
		const key3 = createQueryCacheKey("test.query", { items: [3, 2, 1] });

		expect(key1).toBe(key2);
		expect(key1).not.toBe(key3);
	});

	it("should handle null and undefined values", () => {
		const key1 = createQueryCacheKey("test.query", { a: null, b: 1 });
		const key2 = createQueryCacheKey("test.query", { b: 1, a: null });

		expect(key1).toBe(key2);
	});

	it("should handle empty args", () => {
		const key1 = createQueryCacheKey("test.query", {});
		const key2 = createQueryCacheKey("test.query", {});

		expect(key1).toBe(key2);
	});

	it("should handle deeply nested structures", () => {
		const key1 = createQueryCacheKey("test.query", {
			level1: {
				level2: {
					level3: { c: 3, b: 2, a: 1 },
				},
			},
		});
		const key2 = createQueryCacheKey("test.query", {
			level1: {
				level2: {
					level3: { a: 1, b: 2, c: 3 },
				},
			},
		});

		expect(key1).toBe(key2);
	});

	it("should handle arrays with objects inside", () => {
		const key1 = createQueryCacheKey("test.query", {
			items: [
				{ b: 2, a: 1 },
				{ d: 4, c: 3 },
			],
		});
		const key2 = createQueryCacheKey("test.query", {
			items: [
				{ a: 1, b: 2 },
				{ c: 3, d: 4 },
			],
		});

		expect(key1).toBe(key2);
	});
});

describe("QueryResultCache", () => {
	const createCache = (ttlMs: number, maxSize: number) => {
		const cache = new Map<string, { value: unknown; expiresAt: number }>();

		const get = (key: string): { value: unknown; hit: boolean } | null => {
			const cached = cache.get(key);
			if (!cached) return null;
			if (cached.expiresAt <= Date.now()) {
				cache.delete(key);
				return null;
			}
			return { value: cached.value, hit: true };
		};

		const set = (key: string, value: unknown) => {
			if (cache.size >= maxSize) {
				const oldestKey = cache.keys().next().value;
				if (oldestKey) {
					cache.delete(oldestKey);
				}
			}
			cache.set(key, {
				value,
				expiresAt: Date.now() + ttlMs,
			});
		};

		return { get, set, size: () => cache.size };
	};

	it("should return cached value on cache hit", () => {
		const cache = createCache(60000, 100);
		cache.set("key1", "value1");

		const result = cache.get("key1");
		expect(result).toEqual({ value: "value1", hit: true });
	});

	it("should return null on cache miss", () => {
		const cache = createCache(60000, 100);

		const result = cache.get("nonexistent");
		expect(result).toBeNull();
	});

	it("should evict oldest entry when max size is reached", () => {
		const cache = createCache(60000, 3);
		cache.set("key1", "value1");
		cache.set("key2", "value2");
		cache.set("key3", "value3");

		expect(cache.size()).toBe(3);

		cache.set("key4", "value4");

		expect(cache.size()).toBe(3);
		expect(cache.get("key1")).toBeNull();
		expect(cache.get("key4")).toEqual({ value: "value4", hit: true });
	});

	it("should expire entries after TTL", async () => {
		const cache = createCache(50, 100);
		cache.set("key1", "value1");

		expect(cache.get("key1")).toEqual({ value: "value1", hit: true });

		await new Promise((resolve) => setTimeout(resolve, 60));

		expect(cache.get("key1")).toBeNull();
	});
});
