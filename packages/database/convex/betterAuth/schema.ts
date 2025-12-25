import { defineSchema } from "convex/server";
import { tables as generatedTables } from "./generatedSchema";

export const tables = {
	...generatedTables,
	apikey: generatedTables.apikey.index("key", ["key"]),
};

const schema = defineSchema(tables);

export default schema;
