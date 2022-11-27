import { Prisma, Channel } from "@prisma/client";
import { PrismaOperationTypeMap, TableManager } from "../../primitives/manager";
import { findOrCreate } from "../../utils/operations";
import { Server_CreateInput } from "../server/server-manager";

export type Channel_Mutable = Partial<Pick<Prisma.ChannelCreateInput, "name">>;

export type Channel_CreateInput = Pick<
  Prisma.ChannelUncheckedCreateInput,
  "id" | "name" | "type" | "server_id"
> &
  Channel_Mutable;

type ChannelDelegate = Prisma.ChannelDelegate<false>;

interface SafeChannelOperations
  extends PrismaOperationTypeMap<Channel, ChannelDelegate, Channel_CreateInput, Channel_Mutable> {}

type Channel_CreateWithDependencies = {
  channel: Channel_CreateInput;
  server: Server_CreateInput;
};

export type Channel_UpsertData = {
  update: {
    data: Channel_Mutable;
  };
  create: Channel_CreateWithDependencies;
};

export class ChannelManager extends TableManager<ChannelDelegate, SafeChannelOperations> {
  public async createWithDependencies(data: Channel_CreateWithDependencies): Promise<Channel> {
    const server = await this.client.servers.findCreate(data.server);
    return this.create({
      data: {
        id: data.channel.id,
        name: data.channel.name,
        type: data.channel.type,
        server_id: server.id,
      },
    });
  }

  public async upsert(data: Channel_UpsertData): Promise<Channel> {
    const existing_channel = await this.findUnique({
      where: {
        id: data.create.channel.id,
      },
    });
    if (existing_channel) {
      return this.update({
        where: {
          id: existing_channel.id,
        },
        data: data.update.data,
      });
    } else {
      return this.createWithDependencies(data.create);
    }
  }

  public async findCreate(input: Channel_CreateWithDependencies): Promise<Channel> {
    return findOrCreate(
      () => this.findUnique({ where: { id: input.channel.id } }),
      () => this.createWithDependencies(input)
    );
  }
}
