import { copyFileSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(scriptDir, "../src");
const proxyTargetPath = resolve(srcDir, "proxy.ts");
const proxySourcePath = resolve(srcDir, "proxy.vercel.ts");
const deployTarget = process.env.DEPLOY_TARGET ?? "vercel";

if (deployTarget === "cloudflare") {
	if (existsSync(proxyTargetPath)) {
		rmSync(proxyTargetPath);
	}
} else {
	copyFileSync(proxySourcePath, proxyTargetPath);
}
