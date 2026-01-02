import { defineCommand } from "just-bash";
import { createGunzip } from "node:zlib";
import { isBinaryFile } from "./binary-extensions";

export type GitCredentialProvider = (
	owner: string,
	repo: string,
) => Promise<string | null>;

export interface GitCloneCommandOptions {
	credentialProvider?: GitCredentialProvider;
	allowedHosts?: Array<string>;
}

async function streamDownloadAndDecompress(
	url: string,
	token: string | null,
): Promise<Uint8Array> {
	const headers: Record<string, string> = {};
	if (token) {
		headers["Authorization"] = `token ${token}`;
	}

	const response = await fetch(url, { headers });
	if (!response.ok) {
		throw new Error(`Failed to fetch archive: ${response.status}`);
	}

	const gunzip = createGunzip();
	const chunks: Array<Buffer> = [];

	return new Promise((resolve, reject) => {
		gunzip.on("data", (chunk) => chunks.push(chunk));
		gunzip.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
		gunzip.on("error", reject);

		const reader = response.body!.getReader();
		(async () => {
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					gunzip.end();
					break;
				}
				gunzip.write(value);
			}
		})().catch(reject);
	});
}

function parseTar(data: Uint8Array): Map<string, Uint8Array> {
	const files = new Map<string, Uint8Array>();
	let offset = 0;

	while (offset < data.length - 512) {
		const header = data.slice(offset, offset + 512);
		if (header.every((b) => b === 0)) break;

		const nameBytes = header.slice(0, 100);
		const nullIdx = nameBytes.indexOf(0);
		const name = new TextDecoder().decode(
			nullIdx >= 0 ? nameBytes.slice(0, nullIdx) : nameBytes,
		);

		const sizeStr = new TextDecoder().decode(header.slice(124, 136)).trim();
		const size = parseInt(sizeStr, 8) || 0;
		const typeFlag = header[156];

		offset += 512;

		if (typeFlag === 48 || typeFlag === 0) {
			files.set(name, data.slice(offset, offset + size));
		}

		offset += Math.ceil(size / 512) * 512;
	}

	return files;
}

export function createGitCloneCommand(options: GitCloneCommandOptions = {}) {
	const { credentialProvider, allowedHosts = ["github.com"] } = options;

	return defineCommand("git", async (args, ctx) => {
		if (args[0] !== "clone") {
			return {
				stdout: "",
				stderr: "Only git clone is supported",
				exitCode: 1,
			};
		}

		const repoUrl = args.find((arg) =>
			allowedHosts.some((host) => arg.includes(host)),
		);
		if (!repoUrl) {
			return {
				stdout: "",
				stderr: `No valid repository URL provided. Allowed hosts: ${allowedHosts.join(", ")}`,
				exitCode: 1,
			};
		}

		const allowedPrefixes = allowedHosts.map((h) => `https://${h}/`);
		if (!allowedPrefixes.some((prefix) => repoUrl.startsWith(prefix))) {
			return {
				stdout: "",
				stderr: `Only HTTPS URLs from allowed hosts are permitted: ${allowedHosts.join(", ")}`,
				exitCode: 1,
			};
		}

		const safeUrlPattern = /^https:\/\/[\w.-]+\/[\w.-]+\/[\w.-]+(\.git)?$/;
		if (!safeUrlPattern.test(repoUrl)) {
			return {
				stdout: "",
				stderr: "Invalid repository URL format",
				exitCode: 1,
			};
		}

		const urlParts = repoUrl.replace(/\.git$/, "").split("/");
		const repoName = urlParts[urlParts.length - 1] || "repo";
		const owner = urlParts[urlParts.length - 2] || "";

		const branchIndex = args.indexOf("-b");
		const branch =
			branchIndex !== -1 && args[branchIndex + 1]
				? args[branchIndex + 1]
				: "HEAD";

		let targetDir: string | undefined;
		const depthIndex = args.indexOf("--depth");
		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			if (arg === undefined) continue;
			if (arg.startsWith("-")) continue;
			if (arg === "clone") continue;
			if (allowedHosts.some((host) => arg.includes(host))) continue;
			if (depthIndex !== -1 && i === depthIndex + 1) continue;
			if (branchIndex !== -1 && i === branchIndex + 1) continue;
			targetDir = arg;
			break;
		}

		if (!targetDir) {
			targetDir = repoName;
		}

		const targetPath = targetDir.startsWith("/")
			? targetDir
			: ctx.cwd + "/" + targetDir;

		if (targetPath.includes("..")) {
			return {
				stdout: "",
				stderr: "Path traversal not allowed",
				exitCode: 1,
			};
		}

		try {
			let token: string | null = null;

			if (credentialProvider && owner && repoName) {
				token = await credentialProvider(owner, repoName);
			}

			const archiveUrl =
				branch === "HEAD"
					? `https://github.com/${owner}/${repoName}/archive/HEAD.tar.gz`
					: `https://github.com/${owner}/${repoName}/archive/refs/heads/${branch}.tar.gz`;

			const tarData = await streamDownloadAndDecompress(archiveUrl, token);
			const files = parseTar(tarData);

			await ctx.fs.mkdir(targetPath, { recursive: true });

			const dirsToCreate = new Set<string>();
			const filesToWrite: Array<{ path: string; content: string }> = [];
			let skippedBinary = 0;
			let skippedError = 0;

			const prefixPattern = new RegExp(`^${repoName}-[^/]+/`);

			for (const [filePath, content] of files) {
				const match = filePath.match(prefixPattern);
				if (!match) continue;

				const relativePath = filePath.slice(match[0].length);
				if (!relativePath) continue;

				const fullPath = `${targetPath}/${relativePath}`;

				if (isBinaryFile(relativePath)) {
					skippedBinary++;
					continue;
				}

				const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
				dirsToCreate.add(dir);

				try {
					const text = new TextDecoder().decode(content);
					filesToWrite.push({ path: fullPath, content: text });
				} catch {
					skippedError++;
				}
			}

			const sortedDirs = [...dirsToCreate].sort((a, b) => a.length - b.length);
			for (const dir of sortedDirs) {
				await ctx.fs.mkdir(dir, { recursive: true });
			}

			const BATCH_SIZE = 500;
			for (let i = 0; i < filesToWrite.length; i += BATCH_SIZE) {
				const batch = filesToWrite.slice(i, i + BATCH_SIZE);
				await Promise.all(
					batch.map(({ path, content }) => ctx.fs.writeFile(path, content)),
				);
			}

			return {
				stdout:
					"Cloning into '" +
					targetPath +
					"'...\nCopied " +
					filesToWrite.length +
					" text files.\nSkipped " +
					skippedBinary +
					" binary files (by extension).\nSkipped " +
					skippedError +
					" files (read errors).\ndone.\n",
				stderr: "",
				exitCode: 0,
			};
		} catch (error) {
			let errorMsg = String(error);
			if (options.credentialProvider) {
				errorMsg = errorMsg.replace(
					/x-access-token:[^@]+@/g,
					"x-access-token:[REDACTED]@",
				);
			}
			return {
				stdout: "",
				stderr: "Failed to clone: " + errorMsg,
				exitCode: 1,
			};
		}
	});
}
