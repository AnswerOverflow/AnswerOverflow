import type { GenericId } from "convex/values";
import { type Option, Schema, SchemaAST } from "effect";

const ConvexId = Symbol.for("ConvexId");

export const Id = <TableName extends string>(
  tableName: TableName,
): Schema.Schema<GenericId<TableName>> =>
  Schema.String.pipe(
    Schema.annotations({ [ConvexId]: tableName }),
  ) as unknown as Schema.Schema<GenericId<TableName>>;

export const tableName = <TableName extends string>(
  ast: SchemaAST.AST,
): Option.Option<TableName> =>
  SchemaAST.getAnnotation<TableName>(ConvexId)(ast);
