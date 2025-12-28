import { Schema } from "effect";

export const PaginationResult = <Doc extends Schema.Schema.AnyNoContext>(
	Doc: Doc,
) =>
	Schema.Struct({
		page: Schema.Array(Doc).pipe(Schema.mutable),
		isDone: Schema.Boolean,
		continueCursor: Schema.String,
		splitCursor: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
		pageStatus: Schema.optional(
			Schema.Union(
				Schema.Literal("SplitRecommended"),
				Schema.Literal("SplitRequired"),
				Schema.Null,
			),
		),
	}).pipe(Schema.mutable);
