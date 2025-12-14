export function encodeCursor(cursor: string): string {
	const bytes = new Uint8Array(cursor.length / 2);
	for (let i = 0; i < cursor.length; i += 2) {
		bytes[i / 2] = parseInt(cursor.substring(i, i + 2), 16);
	}

	const base64 = btoa(String.fromCharCode(...bytes));
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCursor(encoded: string): string {
	let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
	const padding = (4 - (base64.length % 4)) % 4;
	base64 += "=".repeat(padding);

	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}

	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
