import { Prisma, Server } from "@prisma/client";
import { PrismaOperationTypeMap, TableManager } from "../../primitives/manager";
import { findCreateReusable } from "../../utils/operations";

export type Server_Mutable = Partial<
  Pick<Prisma.ServerCreateInput, "name" | "icon" | "id" | "kicked_time">
>;
export type Server_CreateInput = Prisma.ServerCreateInput & Server_Mutable;

type ServerDelegate = Prisma.ServerDelegate<false>;

interface SafeServerOperations
  extends PrismaOperationTypeMap<Server, ServerDelegate, Server_CreateInput, Server_Mutable> {}

export class ServerManager extends TableManager<ServerDelegate, SafeServerOperations> {
  public async findCreate(input: Server_CreateInput): Promise<Server> {
    return findCreateReusable(
      () => this.findUnique({ where: { id: input.id } }),
      () => this.create({ data: input })
    );
  }
}
