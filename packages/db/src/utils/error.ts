export const DB_ERROR_CODES = [
	"IGNORED_ACCOUNT",
	"NOT_IGNORED_ACCOUNT",
	"INVALID_CONFIGURATION",
	"MESSAGE_INDEXING_DISABLED"
] as const;
export type DBErrorCode = (typeof DB_ERROR_CODES)[number];

export class DBError extends Error {
	code: DBErrorCode;
	constructor(message: string, code: DBErrorCode) {
		super(message);
		this.name = "DBError";
		this.code = code;
	}
}
