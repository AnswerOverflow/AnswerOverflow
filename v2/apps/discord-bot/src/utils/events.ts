import type { ClientEvents, GuildMember, Message } from "discord.js";
import { ChannelWithFlags } from "@answeroverflow/core/zod";
import type { Subject } from "rxjs";

type AOEvent<E extends keyof ClientEvents, D extends object = object> = {
  raw: ClientEvents[E];
} & D;

export type AOEvents = {
  messageCreate: AOEvent<
    "messageCreate",
    { channelSettings: ChannelWithFlags }
  >;
  threadCreate: AOEvent<"threadCreate", { channelSettings: ChannelWithFlags }>;
  questionAsked: AOEvent<
    "threadCreate",
    {
      channelSettings: ChannelWithFlags;
      questionAsker: GuildMember;
      question: Message | null;
    }
  >;
  clientReady: AOEvent<"clientReady">;
};

// ☭
type AOUnion = {
  [K in keyof AOEvents]: { action: K; data: AOEvents[K] };
}[keyof AOEvents];

export type AOEventSubject = Subject<AOUnion>;
