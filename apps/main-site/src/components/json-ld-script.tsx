import serialize from "serialize-javascript";

export function JsonLdScript(props: { data: object; scriptKey: string }) {
	return (
		<script
			type="application/ld+json"
			id={props.scriptKey}
			dangerouslySetInnerHTML={{
				__html: serialize(props.data, { isJSON: true }),
			}}
		/>
	);
}
