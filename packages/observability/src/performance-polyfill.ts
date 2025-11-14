// Polyfill performance API for Convex v8 runtime before importing OpenTelemetry
// OpenTelemetry core tries to use performance API at module load time
// This must be imported before any OpenTelemetry imports
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

// Polyfill console.dir for Convex v8 runtime
// ConsoleSpanExporter uses console.dir() which is not available in Convex
if (typeof console.dir === "undefined") {
	console.dir = (value) => {
		console.log(`__OTEL_SPAN__${JSON.stringify(value)}`);
	};
}
