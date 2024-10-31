import { $ } from "bun";

// Check if .env file exists, if it does, exit the script
import * as fs from "fs";
import * as Bun from "bun";
if (fs.existsSync(".env")) {
  console.error(
    "An .env file already exists. Please delete it and run this script again.",
  );
  process.exit(0);
}

// Step 1: Prompt the user for Discord bot credentials
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

console.log(
  "We need to create a Discord bot to run the application, we will walk you through the process.",
);
console.log(
  "Start at https://discord.com/developers/applications and create a new application. Search on the page for Application ID",
);
const NEXT_PUBLIC_DISCORD_CLIENT_ID = await askQuestion(
  "Enter your Discord Application ID: ",
);
console.clear();

console.log(
  `Now go to https://discord.com/developers/applications/${NEXT_PUBLIC_DISCORD_CLIENT_ID}/oauth2 and click on 'Reset Secret' to get your Client Secret.`,
);
const DISCORD_CLIENT_SECRET = await askQuestion(
  "Enter your Discord Client Secret: ",
);
console.clear();

console.log(
  `Now go to https://discord.com/developers/applications/${NEXT_PUBLIC_DISCORD_CLIENT_ID}/bot and click on 'Reset Token' to get your Bot Token.`,
);
const DISCORD_BOT_TOKEN = await askQuestion("Enter your Discord Bot Token: ");
console.clear();

// Step 1: Create .env file with the provided Discord bot token, secret, and client ID
console.log("Creating .env file...");
await Bun.write(
  ".env",
  `DISCORD_TOKEN=${DISCORD_BOT_TOKEN}\nDISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}\nNEXT_PUBLIC_DISCORD_CLIENT_ID=${NEXT_PUBLIC_DISCORD_CLIENT_ID}\n`,
);
console.log(".env file created successfully with your provided credentials.");

console.clear();

// Step 2: Run bun install
console.log("Running bun install...");
await $`bun i`;

// Step 3: Start bun dev:dbs in the background in a new terminal
console.log("Starting bun dev:dbs in the background...");
const { spawn } = require("child_process");
spawn("bun", ["dev:dbs"], {
  detached: true,
  stdio: "ignore",
});
// wait for 5 seconds to ensure the dbs are up and running
await new Promise((resolve) => setTimeout(resolve, 30000));

// Step 4: Change directory to packages/core, push and seed database
console.log("Changing directory to packages/core...");
process.chdir("packages/core");

console.log("Pushing database schema...");
await $`bun db:push`;

console.log("Wiping database...");
await $`bun db:wipe`;

console.log("Seeding database...");
await $`bun db:seed`;

console.log("Script execution completed.");

rl.close();
process.exit(0);
