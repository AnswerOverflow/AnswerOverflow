declare module "memoizee" {
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

