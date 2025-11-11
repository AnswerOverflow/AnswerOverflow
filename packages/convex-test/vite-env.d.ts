interface ImportMeta {
	glob<M = Record<string, () => Promise<unknown>>>(
		pattern: string,
	): Record<string, () => Promise<M>>;
}
