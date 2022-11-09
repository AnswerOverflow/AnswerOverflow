export { AnswerOverflowClient } from "./answer-overflow-client";
// if this is not here hot reloading breaks, I have no idea why
export class _ {}
export type {
  User,
  UserChannelSettings,
  UserServerSettings,
  Channel,
  ChannelSettings,
  DeletedUser,
  ForumChannelTag,
  Server,
  ServerSettings,
} from "@prisma/client";

import { Prisma } from "@prisma/client";
