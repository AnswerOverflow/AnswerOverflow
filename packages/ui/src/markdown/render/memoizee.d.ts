/** biome-ignore-all lint/suspicious/noExplicitAny: TODO: Fix the any */
declare module "memoizee" {
	function memoize<T extends (...args: any[]) => any>(
		fn: T,
		options?: {
			normalizer?: (...args: Parameters<T>) => string;
		},
	): T;
	export default memoize;
}
