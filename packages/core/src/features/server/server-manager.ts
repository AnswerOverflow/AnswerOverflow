import { Prisma, Server } from "@prisma/client";
import { PrismaOperationTypeMap, TableManager } from "../../primitives/manager";
import { findOrCreate } from "../../utils/operations";

export type Server_Mutable = Partial<
  Pick<Prisma.ServerCreateInput, "name" | "icon" | "id" | "kicked_time">
>;
export type Server_CreateInput = Prisma.ServerCreateInput & Server_Mutable;

type ServerDelegate = Prisma.ServerDelegate<false>;

interface SafeServerOperations
  extends PrismaOperationTypeMap<Server, ServerDelegate, Server_CreateInput, Server_Mutable> {}

export class ServerManager extends TableManager<ServerDelegate, SafeServerOperations> {
  public async upsert(data: Server_CreateInput): Promise<Server> {
    const server = await this.findUnique({ where: { id: data.id } });
    if (server) {
      return this.update({ where: { id: data.id }, data });
    }
    return this.create({ data });
  }
  public async findCreate(input: Server_CreateInput): Promise<Server> {
    return findOrCreate(
      () => this.findUnique({ where: { id: input.id } }),
      () => this.create({ data: input })
    );
  }
}
