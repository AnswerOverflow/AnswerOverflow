// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createS3Client } from "./storage";

// The Vercel daemon exports its OIDC token file as AWS_WEB_IDENTITY_TOKEN_FILE.
// This checks that the S3 client then assumes AWS_ROLE_ARN with whatever token
// the file holds at refresh time, against a local stand-in for STS.

const roleArn = "arn:aws:iam::000000000000:role/discord-bot-test";
const seenTokens: string[] = [];
let server: Server;
let dir: string;
let tokenFile: string;
const savedEnv = { ...process.env };

const stsResponse = (
	expiration: string,
) => `<AssumeRoleWithWebIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
  <AssumeRoleWithWebIdentityResult>
    <Credentials>
      <AccessKeyId>ASIATESTACCESSKEY</AccessKeyId>
      <SecretAccessKey>test-secret</SecretAccessKey>
      <SessionToken>test-session</SessionToken>
      <Expiration>${expiration}</Expiration>
    </Credentials>
    <AssumedRoleUser>
      <Arn>${roleArn}/session</Arn>
      <AssumedRoleId>AROATEST:session</AssumedRoleId>
    </AssumedRoleUser>
  </AssumeRoleWithWebIdentityResult>
</AssumeRoleWithWebIdentityResponse>`;

beforeAll(async () => {
	server = createServer((req, res) => {
		let body = "";
		req.on("data", (chunk) => {
			body += chunk;
		});
		req.on("end", () => {
			const params = new URLSearchParams(body);
			expect(params.get("Action")).toBe("AssumeRoleWithWebIdentity");
			expect(params.get("RoleArn")).toBe(roleArn);
			seenTokens.push(params.get("WebIdentityToken") ?? "");
			// Expiring inside the SDK's refresh window forces a refresh per call.
			const expiration = new Date(Date.now() + 60_000).toISOString();
			res.writeHead(200, { "content-type": "text/xml" });
			res.end(stsResponse(expiration));
		});
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

	dir = mkdtempSync(join(tmpdir(), "oidc-"));
	tokenFile = join(dir, "token");

	for (const key of Object.keys(process.env)) {
		if (key.startsWith("AWS_")) delete process.env[key];
	}
	Object.assign(process.env, {
		AWS_ROLE_ARN: roleArn,
		AWS_WEB_IDENTITY_TOKEN_FILE: tokenFile,
		AWS_REGION: "us-east-1",
		AWS_ENDPOINT_URL_STS: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`,
		AWS_SHARED_CREDENTIALS_FILE: join(dir, "missing-credentials"),
		AWS_CONFIG_FILE: join(dir, "missing-config"),
		AWS_EC2_METADATA_DISABLED: "true",
	});
});

afterAll(async () => {
	process.env = savedEnv;
	rmSync(dir, { recursive: true, force: true });
	await new Promise((resolve) => server.close(resolve));
});

describe("createS3Client", () => {
	it("assumes the role with the current web identity token", async () => {
		const client = createS3Client();

		writeFileSync(tokenFile, "token-one");
		const first = await client.config.credentials();
		expect(first.accessKeyId).toBe("ASIATESTACCESSKEY");

		// Near expiry, the SDK refreshes in the background and re-reads the file.
		writeFileSync(tokenFile, "token-two");
		await client.config.credentials();
		await vi.waitFor(() =>
			expect(seenTokens).toEqual(["token-one", "token-two"]),
		);
	});
});
