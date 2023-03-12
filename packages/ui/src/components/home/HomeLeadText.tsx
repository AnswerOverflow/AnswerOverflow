import { Button } from '../primitives/Button';

export const HomeLeadText = () => {
	return (
		<div className="flex w-full flex-col items-start justify-center gap-6 xl:w-[60%]">
			<h1 className="text-center font-header text-4xl font-bold leading-[114.5%] text-ao-white md:text-start md:text-6xl">
				Bringing your discord channels to google
			</h1>
			<p className="text-center font-body text-lg text-ao-white dark:text-ao-white/[.85] md:text-start md:text-xl">
				Answer Overflow is an open source project designed to bring discord
				channels to your favourite search engine, enabling users to easily find
				the info they need, fast.
			</p>
			<Button
				type={'solid'}
				color={'white'}
				className="mx-auto shadow-[0px_0px_40px_rgba(255,_255,_255,_0.2)] duration-200 hover:shadow-[0px_0px_40px_rgba(255,_255,_255,_0.4)] xl:mx-0"
			>
				<span className="text-2xl">Get Started</span>
			</Button>
		</div>
	);
};
