import serialize from "serialize-javascript";

export function JsonLdScript(props: { data: object; scriptKey: string }) {
	return (
		<script
			type="application/ld+json"
			id={props.scriptKey}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: This is safe because the data is serialized
			dangerouslySetInnerHTML={{
				__html: serialize(props.data, { isJSON: true }),
			}}
		/>
	);
}
