import { Prisma, Server } from "@prisma/client";
import { Manager } from "../manager";

export class ServerManager extends Manager {
  public async createServer(data: Prisma.ServerCreateInput): Promise<Server | null> {
    const server = await this.answer_overflow_client.prisma.server.create({
      data,
    });
    return server;
  }
  public async getServer<T extends Prisma.ServerFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.ServerFindUniqueArgs>
  ) {
    const server = await this.answer_overflow_client.prisma.server.findUnique(args);
    return server;
  }
  public async getServers<T extends Prisma.ServerFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ServerFindManyArgs>
  ) {
    const servers = await this.answer_overflow_client.prisma.server.findMany(args);
    return servers;
  }

  public async upsertServer<T extends Prisma.ServerUpsertArgs>(
    args: Prisma.SelectSubset<T, Prisma.ServerUpsertArgs>
  ) {
    const server = await this.answer_overflow_client.prisma.server.upsert(args);
    return server;
  }
}
