import type { VirtualBash } from "./virtual-bash.ts";

export interface VirtualBashMCPServerOptions {
	virtualBash: VirtualBash;
	port: number;
	toolDescription?: string;
}

export interface VirtualBashMCPServer {
	url: string;
	stop: () => void;
}

export function createVirtualBashMCPServer(
	options: VirtualBashMCPServerOptions,
): VirtualBashMCPServer {
	const {
		virtualBash,
		port,
		toolDescription = "Execute commands in a virtualized bash environment. Use this tool to explore files, run commands like ls, cat, head, tail, grep, find, etc. This is an IN-MEMORY virtual filesystem - it does NOT access the real disk.",
	} = options;

	const server = Bun.serve({
		port,
		async fetch(req) {
			const url = new URL(req.url);

			if (req.method === "GET" && url.pathname === "/mcp") {
				return new Response(
					JSON.stringify({
						name: "virtual-bash",
						version: "1.0.0",
						tools: [
							{
								name: "virtual_bash",
								description: toolDescription,
								inputSchema: {
									type: "object",
									properties: {
										command: {
											type: "string",
											description:
												"The bash command to execute in the virtual filesystem",
										},
									},
									required: ["command"],
								},
							},
						],
					}),
					{ headers: { "Content-Type": "application/json" } },
				);
			}

			if (req.method === "POST" && url.pathname === "/mcp") {
				const body = await req.json();

				if (body.method === "tools/list") {
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							id: body.id,
							result: {
								tools: [
									{
										name: "virtual_bash",
										description: toolDescription,
										inputSchema: {
											type: "object",
											properties: {
												command: {
													type: "string",
													description:
														"The bash command to execute in the virtual filesystem",
												},
											},
											required: ["command"],
										},
									},
								],
							},
						}),
						{ headers: { "Content-Type": "application/json" } },
					);
				}

				if (body.method === "tools/call") {
					const command = body.params?.arguments?.command;
					const result = await virtualBash.exec(command);
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							id: body.id,
							result: {
								content: [
									{
										type: "text",
										text: `Exit Code: ${result.exitCode}\n\nOutput:\n${result.stdout}${result.stderr ? "\nStderr:\n" + result.stderr : ""}`,
									},
								],
							},
						}),
						{ headers: { "Content-Type": "application/json" } },
					);
				}

				if (body.method === "initialize") {
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							id: body.id,
							result: {
								protocolVersion: "2024-11-05",
								capabilities: { tools: {} },
								serverInfo: { name: "virtual-bash", version: "1.0.0" },
							},
						}),
						{ headers: { "Content-Type": "application/json" } },
					);
				}

				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						id: body.id,
						error: { code: -32601, message: "Method not found" },
					}),
					{ headers: { "Content-Type": "application/json" } },
				);
			}

			return new Response("Not found", { status: 404 });
		},
	});

	return {
		url: `http://127.0.0.1:${port}/mcp`,
		stop: () => server.stop(),
	};
}
