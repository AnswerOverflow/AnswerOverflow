export default function MessageResult({
	params,
}: {
	params: { messageId: string };
}) {
	return (
		<>
			<h1>hello {params.messageId}</h1>
		</>
	);
}
