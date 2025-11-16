export class LiveData<T> {
	private _data: T | undefined;
	private unsubscribe: (() => void) | undefined;

	constructor(
		getCurrentValue: () => T | undefined,
		onUpdate: (callback: () => void) => () => void,
		initialData?: T,
	) {
		this._data = initialData ?? getCurrentValue();

		this.unsubscribe = onUpdate(() => {
			const newData = getCurrentValue();
			if (newData !== undefined) {
				this._data = newData;
			}
		});
	}

	get data(): T | undefined {
		return this._data;
	}

	destroy(): void {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = undefined;
		}
	}
}
