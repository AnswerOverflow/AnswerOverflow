'use client';
import * as React from 'react';
import { animated, useSpring } from 'react-spring';

export const FollowCursor = (props: {
	className?: string;
	children: React.ReactNode;
	intensity?: number;
	scale?: number;
}) => {
	const [spr, set] = useSpring(() => ({
		xys: [0, 0, 1],
		config: { mass: 2, tension: 350, friction: 100 },
	}));
	const animatedRef = React.useRef<HTMLDivElement>(null);

	const calc = (x: number, y: number) => {
		if (!animatedRef.current) return [0, 0, 1];
		const rect = animatedRef.current.getBoundingClientRect();
		return [
			-(y - rect.top - rect.height / 2) / (props.intensity ?? 10),
			(x - rect.left - rect.width / 2) / (props.intensity ?? 10),
			props.scale ?? 1,
		];
	};

	const AnimatedDiv = animated('div');
	return (
		<AnimatedDiv
			className={props.className}
			ref={animatedRef}
			onMouseMove={({ clientX: x, clientY: y }) => set({ xys: calc(x, y) })}
			onMouseLeave={() => set({ xys: [0, 0, 1] })}
			style={{
				transform: spr.xys.to(
					(x, y, s) =>
						`perspective(600px) rotateX(${x}deg) rotateY(${y}deg) scale(${s})`,
				),
			}}
		>
			{props.children}
		</AnimatedDiv>
	);
};
