import nextWorker from "./.open-next/worker.js";
import {
	buildRoutedRequest,
	buildRoutingResult,
} from "./src/lib/request-routing";

export default {
	fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
		for (const [key, value] of Object.entries(env)) {
			if (typeof value === "string") {
				process.env[key] = value;
			}
		}

		const routingResult = buildRoutingResult({
			method: request.method,
			host: request.headers.get("host") ?? "",
			pathname: new URL(request.url).pathname,
			search: new URL(request.url).search,
			acceptHeader: request.headers.get("accept") ?? "",
			url: request.url,
			bypassSubpathRedirect:
				request.headers.get("X-AnswerOverflow-Skip-Subpath-Redirect") !== null,
		});

		if (routingResult.type === "redirect") {
			return Response.redirect(routingResult.location, routingResult.status);
		}

		return nextWorker.fetch(
			buildRoutedRequest(request, routingResult),
			env,
			ctx,
		);
	},
};
