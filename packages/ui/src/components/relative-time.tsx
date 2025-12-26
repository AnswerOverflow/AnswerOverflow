function formatRelativeTime(timestamp: number, now: number): string {
	const diff = Math.floor((now - timestamp) / 1000);
	if (diff < 60) return "just now";
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
	return new Date(timestamp).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function RelativeTime({
	date,
	className,
}: {
	date: Date;
	className?: string;
}) {
	const timestamp = date.getTime();
	const serverText = formatRelativeTime(timestamp, Date.now());

	return (
		<>
			<span
				data-relative-time={timestamp}
				className={className}
				suppressHydrationWarning
			>
				{serverText}
			</span>
			<script
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Needed for before hydration time setting
				dangerouslySetInnerHTML={{
					__html: `(function(){
var el=document.currentScript.previousElementSibling;
var ts=${timestamp};
var now=Date.now();
var diff=Math.floor((now-ts)/1000);
var text;
if(diff<60)text="just now";
else if(diff<3600)text=Math.floor(diff/60)+"m ago";
else if(diff<86400)text=Math.floor(diff/3600)+"h ago";
else if(diff<604800)text=Math.floor(diff/86400)+"d ago";
else text=new Date(ts).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
el.textContent=text;
})();`,
				}}
			/>
		</>
	);
}
