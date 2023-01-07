import { ReacordTester } from "@answeroverflow/reacord";
import { container } from "@sapphire/framework";
import { Client } from "discord.js";
import { basename, extname } from "path";

import { createClient } from "~discord-bot/utils/bot";
import { mockClientUser } from "./user-mock";

// References: https://dev.to/heymarkkop/how-to-implement-test-and-mock-discordjs-v13-slash-commands-with-typescript-22lc

export function mockClient() {
  // TODO: This is so ugly please fix this
  const client = createClient();
  client.stores.forEach((store) => {
    // @ts-ignore
    // replace the functionality of adding to the store to use a function that adds everything that doesn't include the /dist folder, along with that ignore any test files as those shouldn't be loaded
    store.registerPath = (path) => {
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      if (!path.includes("/dist")) {
        store.paths.add(path.toString());
      }
    };

    // Add the source path to the store
    const path = process.cwd();
    store.paths.add(path + `/src/${store.name}`);

    // Add the typescript extensions to be able to be parsed
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    store.strategy.supportedExtensions.push(".ts", ".cts", ".mts", ".tsx");

    // Filter out type files
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    store.strategy.filterDtsFiles = true;

    // @ts-ignore
    store.strategy.filter = jest.fn((file_path) => {
      // Retrieve the file extension.
      const extension = extname(file_path);
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      if (!store.strategy.supportedExtensions.includes(extension)) return null;

      // @ts-ignore
      if (store.strategy.filterDtsFiles && file_path.endsWith(".d.ts")) return null;

      if (file_path.includes(".test")) return null;

      // Retrieve the name of the file, return null if empty.
      const name = basename(file_path, extension);
      if (name === "") return null;

      // Return the name and extension.
      return { extension, path: file_path, name };
    });
  });

  Client.prototype.login = jest.fn();
  container.reacord = new ReacordTester();
  mockClientUser(client, {
    id: process.env.DISCORD_CLIENT_ID,
  });
  return client;
}

export function mockReacord() {
  return container.reacord as ReacordTester;
}
