// thank you https://stackoverflow.com/questions/61132262/typescript-deep-partial
export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
