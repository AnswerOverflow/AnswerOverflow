if (typeof globalThis.performance === "undefined") {
	globalThis.performance = {
		now: () => Date.now(),
		timeOrigin: Date.now(),
		mark: () => {},
		measure: () => {},
		getEntriesByType: () => [],
		getEntriesByName: () => [],
		clearMarks: () => {},
		clearMeasures: () => {},
		clearResourceTimings: () => {},
	} as unknown as Performance;
}

if (typeof console.dir === "undefined") {
	console.dir = (value) => {
		console.log(`__OTEL_SPAN__${JSON.stringify(value)}`);
	};
}
