import JSONBig from 'json-bigint';
export const JSONParse = (json: string | null) => {
	if (json === null) return null;
	return JSONBig.parse(json);
};

export const JSONStringify = (json: any) => {
	return JSONBig.stringify(json);
};
