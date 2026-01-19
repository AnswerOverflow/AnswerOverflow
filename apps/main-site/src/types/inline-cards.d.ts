import "react";

declare module "react" {
	namespace JSX {
		interface IntrinsicElements {
			"message-card": { id?: string; children?: React.ReactNode };
			"thread-card": { id?: string; children?: React.ReactNode };
			"server-card": { id?: string; children?: React.ReactNode };
		}
	}
}
