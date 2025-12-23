import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const root = require("@opentelemetry/otlp-transformer/build/src/generated/root.js");

const metricsRequestType =
	root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;

const transformMetricsRequest = (
	request: HttpClientRequest.HttpClientRequest,
): HttpClientRequest.HttpClientRequest => {
	const isMetricsEndpoint = request.url.includes("/v1/metrics");
	if (!isMetricsEndpoint) {
		return request;
	}

	const body = request.body;
	if (body._tag !== "Uint8Array") {
		return request;
	}

	try {
		const jsonString = new TextDecoder().decode(body.body);
		const jsonBody = JSON.parse(jsonString);
		const encoded = metricsRequestType.encode(jsonBody).finish();
		const protobufBody = new Uint8Array(encoded);

		return HttpClientRequest.setHeader(
			HttpClientRequest.bodyUint8Array(request, protobufBody),
			"content-type",
			"application/x-protobuf",
		);
	} catch {
		return request;
	}
};

export const AxiomMetricsHttpClientLayer = Layer.effect(
	HttpClient.HttpClient,
	Effect.gen(function* () {
		const baseClient = yield* HttpClient.HttpClient;
		return HttpClient.mapRequest(baseClient, transformMetricsRequest);
	}),
);
