import http from "node:http";
import https, { Agent } from "node:https";

const convexSiteDomain = process.env.CONVEX_SITE_URL
	? (() => {
			try {
				return new URL(process.env.CONVEX_SITE_URL).hostname;
			} catch {
				return null;
			}
		})()
	: null;

const originalCreateConnection = https.globalAgent.createConnection;

https.globalAgent.createConnection = function (options, callback) {
	const hostname = options.hostname;

	if (typeof hostname === "string") {
		if (hostname.includes(".convex.site")) {
			options.servername = hostname;
		} else if (!options.servername) {
			if (hostname.includes(".") && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
				options.servername = hostname;
			} else if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/) && convexSiteDomain) {
				options.servername = convexSiteDomain;
			}
		}
	}

	return originalCreateConnection.call(this, options, callback);
};

const convexSiteAgent = new Agent({
	keepAlive: true,
	rejectUnauthorized: false, // TODO: Make this process.env.NODE_ENV !== "production" once we have a better way to detect production
});

const originalConvexAgentCreateConnection = convexSiteAgent.createConnection;

convexSiteAgent.createConnection = function (options, callback) {
	const hostname = options.hostname;

	if (typeof hostname === "string" && hostname.includes(".convex.site")) {
		options.servername = hostname;
	}

	return originalConvexAgentCreateConnection.call(this, options, callback);
};

const originalFetch = globalThis.fetch;

globalThis.fetch = function (
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	let url: URL;
	let method: string;
	let headers: HeadersInit;
	let body: BodyInit | null | undefined;

	if (input instanceof Request) {
		url = new URL(input.url);
		method = input.method;
		headers = input.headers;
		body = input.body;
		if (init) {
			if (init.method) method = init.method;
			if (init.headers) headers = init.headers;
			if (init.body !== undefined) body = init.body;
		}
	} else {
		url = typeof input === "string" ? new URL(input) : input;
		method = init?.method || "GET";
		headers = init?.headers || {};
		body = init?.body;
	}

	if (url.hostname.includes(".convex.site")) {
		return new Promise((resolve, reject) => {
			const headersObj =
				headers instanceof Headers
					? Object.fromEntries(headers.entries())
					: Array.isArray(headers)
						? Object.fromEntries(headers)
						: headers;

			const options = {
				hostname: url.hostname,
				port: url.port || (url.protocol === "https:" ? 443 : 80),
				path: url.pathname + url.search,
				method,
				headers: headersObj,
				agent: url.protocol === "https:" ? convexSiteAgent : http.globalAgent,
			};

			const request = (url.protocol === "https:" ? https : http).request(
				options,
				(response) => {
					const chunks: Uint8Array[] = [];

					response.on("data", (chunk) => {
						chunks.push(chunk);
					});

					response.on("end", () => {
						const responseBody = Buffer.concat(chunks);
						const responseHeaders = new Headers();

						for (const [key, value] of Object.entries(response.headers)) {
							if (value) {
								if (Array.isArray(value)) {
									for (const v of value) {
										responseHeaders.append(key, v);
									}
								} else {
									responseHeaders.set(key, value);
								}
							}
						}

						resolve(
							new Response(responseBody, {
								status: response.statusCode || 200,
								statusText: response.statusMessage || "",
								headers: responseHeaders,
							}),
						);
					});
				},
			);

			request.on("error", reject);

			if (body !== null && body !== undefined) {
				if (typeof body === "string") {
					request.write(body);
					request.end();
				} else if (body instanceof ArrayBuffer) {
					request.write(Buffer.from(body));
					request.end();
				} else if (body instanceof Uint8Array) {
					request.write(body);
					request.end();
				} else if (body instanceof ReadableStream) {
					const reader = body.getReader();
					const pump = () => {
						reader
							.read()
							.then(({ done, value }) => {
								if (done) {
									request.end();
								} else {
									request.write(value);
									pump();
								}
							})
							.catch(reject);
					};
					pump();
					return;
				} else {
					request.end();
				}
			} else {
				request.end();
			}
		});
	}

	return originalFetch.call(this, input, init);
};
