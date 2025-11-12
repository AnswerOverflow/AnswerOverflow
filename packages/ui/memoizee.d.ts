declare module "memoizee" {
	// biome-ignore lint/suspicious/noExplicitAny: old code, we need to update the markdown renderer
	function memoize<T extends (...args: any[]) => any>(
		fn: T,
		options?: {
			length?: number | false;
			maxAge?: number;
			max?: number;
			primitive?: boolean;
			async?: boolean;
			[key: string]: unknown;
		},
	): T;
	export default memoize;
}
