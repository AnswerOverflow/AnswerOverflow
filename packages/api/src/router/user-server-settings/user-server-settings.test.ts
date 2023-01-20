import { createAnswerOverflowBotCtx, mockServer } from "~api/test/utils";
import { serverRouter } from "../server/server";

import { Server, clearDatabase } from "@answeroverflow/db";
import type { userServerSettingsRouter } from "./user-server-settings";

let ao_bot_server_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let ao_bot_user_server_settings_router: ReturnType<
  (typeof userServerSettingsRouter)["createCaller"]
>;

let server: Server;

beforeEach(async () => {
  await clearDatabase();
  server = mockServer();
  const ao_bot = await createAnswerOverflowBotCtx();
  ao_bot_server_router = serverRouter.createCaller(ao_bot);
  await ao_bot_server_router.create(server);
});

describe("User Server Settings Operations", () => {
  it("should create a user server settings", () => {});
  // describe("User Server Settings By Id", () => {});
  // describe("User Server Settings By Id Many", () => {});
  // describe("User Server Settings Create", () => {});
  // describe("User Server Settings Update", () => {});
  // describe("User Server Settings Create With Deps", () => {});
  // describe("User Server Settings Upsert", () => {
  //   describe("User Server Settings Upsert Create", () => {});
  //   describe("User Server Settings Upsert Update", () => {});
  // });
  // describe("User Server Settings Upsert With Deps", () => {
  //   describe("User Server Settings Upsert With Deps Create", () => {});
  //   describe("User Server Settings Upsert With Deps Update", () => {});
  // });
});
