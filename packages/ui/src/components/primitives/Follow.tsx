import * as React from 'react';
import { useSpring, animated } from 'react-spring';

const calc = (x: number, y: number, ref: React.RefObject<HTMLDivElement>) => {
	if (!ref.current) return [0, 0, 1];
	const rect = ref.current.getBoundingClientRect();
	return [
		-(y - rect.top - rect.height / 2) / 20,
		(x - rect.left - rect.width / 2) / 20,
		1.0,
	];
};

export interface ICard {
	image: String;
}

export const FollowCursor = (props: {
	className?: string;
	children: React.ReactNode;
}) => {
	const [spr, set] = useSpring(() => ({
		xys: [0, 0, 1],
		config: { mass: 2, tension: 350, friction: 100 },
	}));
	const animatedRef = React.useRef<HTMLDivElement>(null);

	return (
		<animated.div
			className={props.className}
			ref={animatedRef}
			onMouseMove={({ clientX: x, clientY: y }) =>
				set({ xys: calc(x, y, animatedRef) })
			}
			onMouseLeave={() => set({ xys: [0, 0, 1] })}
			style={{
				transform: spr.xys.to(
					(x, y, s) =>
						`perspective(600px) rotateX(${x}deg) rotateY(${y}deg) scale(${s})`,
				),
			}}
		>
			{props.children}
		</animated.div>
	);
};
