import { ReacordTester } from "@answeroverflow/reacord";
import { container } from "@sapphire/framework";
import { Client } from "discord.js";
import { createClient } from "~discord-bot/utils/bot";

// References: https://dev.to/heymarkkop/how-to-implement-test-and-mock-discordjs-v13-slash-commands-with-typescript-22lc

export function mockClient() {
  // TODO: This is so ugly please fix this
  const client = createClient();
  client.stores.forEach((store) => {
    // replace the functionality of adding to the store to use a function that adds everything that doesn't include the /dist folder
    // @ts-ignore
    store.registerPath = (path) => {
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
  });

  Client.prototype.login = jest.fn();
  container.reacord = new ReacordTester();
  return client;
}

export function mockReacord() {
  return container.reacord as ReacordTester;
}
