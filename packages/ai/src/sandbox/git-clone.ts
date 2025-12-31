import { defineCommand } from "just-bash";
import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { isBinaryFile } from "./binary-extensions";

export type GitCredentialProvider = (
	owner: string,
	repo: string,
) => Promise<string | null>;

export interface GitCloneCommandOptions {
	credentialProvider?: GitCredentialProvider;
	allowedHosts?: Array<string>;
}

interface JustBashFS {
	readFile(
		path: string,
		options?: { encoding?: string } | string,
	): Promise<string>;
	readFileBuffer(path: string): Promise<Uint8Array>;
	writeFile(
		path: string,
		content: string | Uint8Array,
		options?: { encoding?: string } | string,
	): Promise<void>;
	exists(path: string): Promise<boolean>;
	stat(path: string): Promise<{
		isFile: boolean;
		isDirectory: boolean;
		isSymbolicLink: boolean;
		mode: number;
		size: number;
		mtime: Date;
	}>;
	lstat(path: string): Promise<{
		isFile: boolean;
		isDirectory: boolean;
		isSymbolicLink: boolean;
		mode: number;
		size: number;
		mtime: Date;
	}>;
	mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
	readdir(path: string): Promise<Array<string>>;
	rm(
		path: string,
		options?: { recursive?: boolean; force?: boolean },
	): Promise<void>;
	chmod(path: string, mode: number): Promise<void>;
	symlink(target: string, linkPath: string): Promise<void>;
	readlink(path: string): Promise<string>;
}

function createIsomorphicFSAdapter(bashFs: JustBashFS) {
	return {
		promises: {
			readFile: async (
				path: string,
				options?: { encoding?: string } | string,
			) => {
				const encoding =
					typeof options === "string" ? options : options?.encoding;
				if (encoding === "utf8" || encoding === "utf-8") {
					return bashFs.readFile(path, { encoding: "utf8" });
				}
				return bashFs.readFileBuffer(path);
			},
			writeFile: async (
				path: string,
				data: string | Uint8Array,
				options?: { encoding?: string } | string,
			) => {
				await bashFs.writeFile(path, data, options);
			},
			mkdir: async (path: string, options?: { recursive?: boolean }) => {
				await bashFs.mkdir(path, options);
			},
			rmdir: async (path: string) => {
				try {
					await bashFs.rm(path, { recursive: true });
				} catch {
					// Ignore errors - directory may not exist
				}
			},
			unlink: async (path: string) => {
				try {
					await bashFs.rm(path);
				} catch {
					// Ignore errors - file may not exist
				}
			},
			stat: async (path: string) => {
				const exists = await bashFs.exists(path);
				if (!exists) {
					const err = new Error(
						`ENOENT: no such file or directory, stat '${path}'`,
					);
					(err as NodeJS.ErrnoException).code = "ENOENT";
					throw err;
				}
				const s = await bashFs.stat(path);
				return {
					isFile: () => s.isFile,
					isDirectory: () => s.isDirectory,
					isSymbolicLink: () => s.isSymbolicLink,
					mode: s.mode,
					size: s.size,
					mtimeMs: s.mtime.getTime(),
					type: s.isFile ? "file" : s.isDirectory ? "dir" : "unknown",
				};
			},
			lstat: async (path: string) => {
				const exists = await bashFs.exists(path);
				if (!exists) {
					const err = new Error(
						`ENOENT: no such file or directory, lstat '${path}'`,
					);
					(err as NodeJS.ErrnoException).code = "ENOENT";
					throw err;
				}
				const s = await bashFs.lstat(path);
				return {
					isFile: () => s.isFile,
					isDirectory: () => s.isDirectory,
					isSymbolicLink: () => s.isSymbolicLink,
					mode: s.mode,
					size: s.size,
					mtimeMs: s.mtime.getTime(),
					type: s.isFile ? "file" : s.isDirectory ? "dir" : "unknown",
				};
			},
			readdir: async (path: string) => {
				return bashFs.readdir(path);
			},
			readlink: async (path: string) => {
				return bashFs.readlink(path);
			},
			symlink: async (target: string, path: string) => {
				await bashFs.symlink(target, path);
			},
			chmod: async (path: string, mode: number) => {
				await bashFs.chmod(path, mode);
			},
		},
	};
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

		const depthIndex = args.indexOf("--depth");
		const depth =
			depthIndex !== -1 ? Number.parseInt(args[depthIndex + 1] ?? "1", 10) : 1;

		let targetDir: string | undefined;
		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			if (arg === undefined) continue;
			if (arg.startsWith("-")) continue;
			if (arg === "clone") continue;
			if (allowedHosts.some((host) => arg.includes(host))) continue;
			if (depthIndex !== -1 && i === depthIndex + 1) continue;
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

			const tempDir = "/.git-clone-temp-" + Date.now();
			const fs = createIsomorphicFSAdapter(ctx.fs);

			await ctx.fs.mkdir(tempDir, { recursive: true });

			await git.clone({
				fs,
				http,
				dir: tempDir,
				url: repoUrl,
				depth,
				singleBranch: true,
				noTags: true,
				onAuth: token
					? () => ({ username: "x-access-token", password: token })
					: undefined,
			});

			await ctx.fs.mkdir(targetPath, { recursive: true });

			let copied = 0;
			let skippedBinary = 0;
			let skippedError = 0;

			async function copyDir(srcDir: string, destDir: string) {
				const items = await ctx.fs.readdir(srcDir);
				for (const item of items) {
					if (item === ".git") continue;

					const srcPath = srcDir + "/" + item;
					const destPath = destDir + "/" + item;

					try {
						const stat = await ctx.fs.stat(srcPath);
						if (stat.isDirectory) {
							await ctx.fs.mkdir(destPath, { recursive: true });
							await copyDir(srcPath, destPath);
						} else if (stat.isFile) {
							if (isBinaryFile(item)) {
								skippedBinary++;
								continue;
							}
							try {
								const content = await ctx.fs.readFile(srcPath, {
									encoding: "utf8",
								});
								await ctx.fs.writeFile(destPath, content);
								copied++;
							} catch {
								skippedError++;
							}
						}
					} catch {
						skippedError++;
					}
				}
			}

			await copyDir(tempDir, targetPath);

			try {
				await ctx.fs.rm(tempDir, { recursive: true, force: true });
			} catch {}

			return {
				stdout:
					"Cloning into '" +
					targetPath +
					"'...\nCopied " +
					copied +
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
