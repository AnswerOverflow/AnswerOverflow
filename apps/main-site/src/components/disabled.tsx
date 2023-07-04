import React from 'react';

export function Disabled(props: { children: React.ReactNode }) {
	return (
		<div
			className="cursor-not-allowed"
			style={{
				color: '#444',
			}}
		>
			{props.children}
		</div>
	);
}
