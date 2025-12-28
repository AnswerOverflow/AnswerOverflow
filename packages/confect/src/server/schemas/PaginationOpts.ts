import { Schema } from "effect";

export const PaginationOpts = Schema.Struct({
	numItems: Schema.Number,
	cursor: Schema.NullOr(Schema.String),
});
