import { Prisma, Server } from "@prisma/client";
import { PrismaOperationTypeMap, TableManager } from "../../primitives/manager";

export type Server_Mutable = Partial<
  Pick<Prisma.ServerCreateInput, "name" | "icon" | "id" | "kicked_time">
>;
export type Server_Create = Prisma.ServerCreateInput & Server_Mutable;

type ServerDelegate = Prisma.ServerDelegate<false>;

interface SafeServerOperations
  extends PrismaOperationTypeMap<Server, ServerDelegate, Server_Create, Server_Mutable> {}

export class ServerManager extends TableManager<ServerDelegate, SafeServerOperations> {}
