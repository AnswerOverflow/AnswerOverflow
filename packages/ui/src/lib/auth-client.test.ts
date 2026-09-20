import { createServer } from "node:http";
import { toast } from "sonner";
import { expect, it } from "vitest";
import { createAuthClientInstance } from "./auth-client";

it("shows a useful error when a sign-in request receives an HTML challenge", async () => {
	const server = createServer((_request, response) => {
		response.writeHead(429, { "Content-Type": "text/html" });
		response.end("<html>Browser verification required</html>");
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const address = server.address();
		if (!address || typeof address === "string") {
			throw new Error("Expected an HTTP listener");
		}
		const client = createAuthClientInstance(`http://127.0.0.1:${address.port}`);
		const result = await client.signIn.social({
			provider: "discord",
			callbackURL: "http://localhost/",
		});
		expect(result.error?.status).toBe(429);
		const notification = toast
			.getHistory()
			.find((item) => item.id === "sign-in-error");
		if (!notification || !("title" in notification)) {
			throw new Error("Expected a visible sign-in notification");
		}
		expect(notification.title).toBe("Sign-in could not start");
		expect(notification.description).toBe(
			"Sign-in is temporarily limited. Wait a minute and try again.",
		);
	} finally {
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
	}
});
