import { createGunzip } from "node:zlib";
import { defineCommand } from "just-bash";
import { isBinaryFile } from "./binary-extensions";

export type GitCredentialProvider = (
	owner: string,
	repo: string,
) => Promise<string | null>;

const MAX_FILE_COUNT = 50000;
const MAX_SINGLE_FILE_SIZE = 10 * 1024 * 1024;

export interface GitCloneCommandOptions {
	credentialProvider?: GitCredentialProvider;
	allowedHosts?: Array<string>;
}

interface TarFileEntry {
	name: string;
	size: number;
	type: number;
}

function parseTarHeader(header: Buffer): TarFileEntry | null {
	if (header.every((b) => b === 0)) return null;

	const nameBytes = header.subarray(0, 100);
	const nullIdx = nameBytes.indexOf(0);
	const name = nameBytes
		.subarray(0, nullIdx >= 0 ? nullIdx : 100)
		.toString("utf8");

	const sizeStr = header.subarray(124, 136).toString("utf8").trim();
	const size = parseInt(sizeStr, 8) || 0;
	const type = header[156] ?? 0;

	return { name, size, type };
}

interface StreamingTarContext {
	fs: {
		mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
		writeFile: (path: string, content: string) => Promise<void>;
	};
}

async function streamDownloadAndExtract(
	url: string,
	token: string | null,
	targetPath: string,
	repoName: string,
	ctx: StreamingTarContext,
): Promise<{ fileCount: number; skippedBinary: number; skippedError: number }> {
	const headers: Record<string, string> = {};
	if (token) {
		headers.Authorization = `token ${token}`;
	}

	const response = await fetch(url, { headers });
	if (!response.ok) {
		throw new Error(`Failed to fetch archive: ${response.status}`);
	}

	const gunzip = createGunzip();
	const prefixPattern = new RegExp(`^${repoName}-[^/]+/`, "i");

	let fileCount = 0;
	let skippedBinary = 0;
	let skippedError = 0;
	const createdDirs = new Set<string>();

	let buffer = Buffer.alloc(0);
	let currentEntry: TarFileEntry | null = null;
	let entryBytesRemaining = 0;
	let entryChunks: Array<Buffer> = [];

	const processFile = async (entry: TarFileEntry, data: Buffer) => {
		const match = entry.name.match(prefixPattern);
		if (!match) return;

		const relativePath = entry.name.slice(match[0].length);
		if (!relativePath) return;

		const fullPath = `${targetPath}/${relativePath}`;

		if (isBinaryFile(relativePath)) {
			skippedBinary++;
			return;
		}

		const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
		if (dir && !createdDirs.has(dir)) {
			await ctx.fs.mkdir(dir, { recursive: true });
			createdDirs.add(dir);
		}

		try {
			const text = data.toString("utf8");
			await ctx.fs.writeFile(fullPath, text);
			fileCount++;
		} catch {
			skippedError++;
		}
	};

	return new Promise((resolve, reject) => {
		const pendingWrites: Array<Promise<void>> = [];

		gunzip.on("data", (chunk: Buffer) => {
			buffer = Buffer.concat([buffer, chunk]);

			while (buffer.length >= 512) {
				if (currentEntry === null) {
					const header = buffer.subarray(0, 512);
					buffer = buffer.subarray(512);

					const entry = parseTarHeader(header);
					if (!entry) {
						continue;
					}

					if (fileCount >= MAX_FILE_COUNT) {
						gunzip.destroy();
						reject(new Error(`File count exceeds limit of ${MAX_FILE_COUNT}`));
						return;
					}

					const isFile = entry.type === 48 || entry.type === 0;
					if (isFile && entry.size > 0) {
						if (entry.size > MAX_SINGLE_FILE_SIZE) {
							const paddedSize = Math.ceil(entry.size / 512) * 512;
							if (buffer.length >= paddedSize) {
								buffer = buffer.subarray(paddedSize);
							} else {
								currentEntry = { ...entry, size: paddedSize };
								entryBytesRemaining = paddedSize;
								entryChunks = [];
							}
						} else {
							currentEntry = entry;
							entryBytesRemaining = Math.ceil(entry.size / 512) * 512;
							entryChunks = [];
						}
					} else if (isFile && entry.size === 0) {
						pendingWrites.push(processFile(entry, Buffer.alloc(0)));
					}
				} else {
					const toRead = Math.min(entryBytesRemaining, buffer.length);
					const chunk = buffer.subarray(0, toRead);
					buffer = buffer.subarray(toRead);
					entryBytesRemaining -= toRead;

					if (currentEntry.size <= MAX_SINGLE_FILE_SIZE) {
						entryChunks.push(chunk);
					}

					if (entryBytesRemaining === 0) {
						if (currentEntry.size <= MAX_SINGLE_FILE_SIZE) {
							const fileData = Buffer.concat(entryChunks);
							const actualData = fileData.subarray(0, currentEntry.size);
							pendingWrites.push(processFile(currentEntry, actualData));
						}

						currentEntry = null;
						entryChunks = [];
					}
				}
			}
		});

		gunzip.on("end", async () => {
			try {
				await Promise.all(pendingWrites);
				resolve({ fileCount, skippedBinary, skippedError });
			} catch (err) {
				reject(err);
			}
		});

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
			: `${ctx.cwd}/${targetDir}`;

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

			await ctx.fs.mkdir(targetPath, { recursive: true });

			const result = await streamDownloadAndExtract(
				archiveUrl,
				token,
				targetPath,
				repoName,
				ctx,
			);

			return {
				stdout:
					"Cloning into '" +
					targetPath +
					"'...\nCopied " +
					result.fileCount +
					" text files.\nSkipped " +
					result.skippedBinary +
					" binary files (by extension).\nSkipped " +
					result.skippedError +
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
				stderr: `Failed to clone: ${errorMsg}`,
				exitCode: 1,
			};
		}
	});
}
