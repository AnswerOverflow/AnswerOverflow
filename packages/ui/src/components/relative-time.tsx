export function RelativeTime({
	date,
	className,
}: {
	date: Date;
	className?: string;
}) {
	const timestamp = date.getTime();
	return (
		<>
			<span
				data-relative-time={timestamp}
				className={className}
				suppressHydrationWarning
			/>
			<script
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
else text=new Date(ts).toLocaleDateString();
el.textContent=text;
})();`,
				}}
			/>
		</>
	);
}
