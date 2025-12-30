#!/usr/bin/env node

const { join } = require("path");
const { execSync, spawn } = require("child_process");
const readline = require("readline");

// Check if --init flag is passed
const initFlag = process.argv.includes("--init");

console.log("Installing dependencies for the Agent component...");
execSync("npm install", { cwd: __dirname, stdio: "inherit" });
console.log("✅\n");
console.log("Building the Agent component...");
execSync("npm run build", { cwd: __dirname, stdio: "inherit" });
console.log("✅\n");
console.log("Installing dependencies for the playground...");
execSync("npm install", {
	cwd: join(__dirname, "./playground"),
	stdio: "inherit",
});
console.log("✅\n");

if (initFlag) {
	console.log("🚀 Starting interactive setup...\n");

	try {
		console.log("Checking backend configuration...");
		execSync("npx convex dev --once", {
			cwd: __dirname,
			stdio: "inherit",
			stderr: "inherit",
		});
		console.log("✅ Backend setup complete! No API key needed.\n");
	} catch (error) {
		const errorOutput =
			((error.stdout && error.stdout.toString()) || "") +
			((error.stderr && error.stderr.toString()) || "");

		if (
			errorOutput.includes("OPENAI_API_KEY") ||
			errorOutput.includes("GROQ_API_KEY")
			// || errorOutput.includes("OPENROUTER_API_KEY")
		) {
			console.log("🔑 LLM API key required. Let's set one up...\n");

			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			const askQuestion = (question) => {
				return new Promise((resolve) => {
					rl.question(question, resolve);
				});
			};

			const setupApiKey = async () => {
				let apiKey = "";
				let envVarName = "";

				// Ask for OpenAI first
				const wantsOpenAI = await askQuestion(
					"Do you have an OpenAI API key? (y/n): ",
				);
				if (wantsOpenAI.toLowerCase().startsWith("y")) {
					apiKey = await askQuestion("Enter your OpenAI API key: ");
					envVarName = "OPENAI_API_KEY";
				} else {
					// Ask for Groq
					const wantsGroq = await askQuestion(
						"Do you have a Groq API key? (y/n): ",
					);
					if (wantsGroq.toLowerCase().startsWith("y")) {
						apiKey = await askQuestion("Enter your Groq API key: ");
						envVarName = "GROQ_API_KEY";
						// } else {
						//   // Default to OpenRouter
						//   apiKey = await askQuestion("Enter your OpenRouter API key: ");
						//   envVarName = "OPENROUTER_API_KEY";
					}
				}

				rl.close();

				if (!apiKey.trim()) {
					console.log("❌ No API key provided. Setup cancelled.");
					process.exit(1);
				}

				// check .env.local - if CONVEX_DEPLOYMENT starts with "local", we need to start a process
				const fs = require("fs");
				const envContent = fs.readFileSync(
					join(__dirname, ".env.local"),
					"utf8",
				);
				const isLocal = !!envContent
					.split("\n")
					.find((line) => line.startsWith("CONVEX_DEPLOYMENT=local"));
				let convexProcess;
				if (!isLocal) {
					setEnvironmentVariable(__dirname, envVarName, apiKey);
					return;
				}
				console.log(
					"🔧 Starting Convex dev server to set environment variables...",
				);
				convexProcess = spawn("npx", ["convex", "dev"], {
					cwd: __dirname,
					stdio: ["inherit", "inherit", "pipe"],
				});

				let readyFound = false;

				const setupTimeout = setTimeout(() => {
					if (!readyFound) {
						console.log(
							"⏰ Timeout waiting for Convex to be ready. Continuing anyway...",
						);
						convexProcess.kill();
						setEnvironmentVariable(__dirname, envVarName, apiKey);
					}
				}, 30_000);

				convexProcess.stderr.on("data", (data) => {
					const output = data.toString();
					if (output.includes("ready") && !readyFound) {
						readyFound = true;
						clearTimeout(setupTimeout);
						console.log("✅ Convex is ready!");

						setEnvironmentVariable(__dirname, envVarName, apiKey);

						// Stop the convex dev process
						convexProcess.kill();
						console.log("🎉 Setup complete! You can now run: npm run dev");
					}
				});

				convexProcess.on("exit", (code) => {
					if (!readyFound && code !== 0) {
						console.log(
							"❌ Convex dev process failed. Please try running the setup again.",
						);
						process.exit(1);
					}
				});
			};

			(async () => {
				try {
					await setupApiKey();
				} catch (promptError) {
					rl.close();
					console.log("❌ Setup cancelled:", promptError.message);
					process.exit(1);
				}
			})();
		} else {
			console.log("❌ Backend setup failed with an unexpected error:");
			console.log(error);
			process.exit(1);
		}
	}
} else {
	console.log("Now run: npm run dev");
}

function setEnvironmentVariable(cwd, name, value) {
	try {
		console.log(`Setting ${name}...`);
		execSync(`npx convex env set ${name} "${value}"`, {
			cwd: cwd,
			stdio: "inherit",
		});
		console.log("✅ Environment variable set successfully!");
		console.log("🎉 Setup complete! You can now run: npm run dev");
	} catch (error) {
		console.log("❌ Failed to set environment variable:", error.message);
		process.exit(1);
	}
}
