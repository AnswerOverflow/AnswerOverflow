import Image from 'next/image';

export const GoogleSearchBar = () => {
	return (
		<div className="flex w-full flex-col items-center justify-center gap-5 px-5 2xl:flex-row">
			<div className="relative hidden h-14 w-28 2xl:block">
				<Image
					src={'/googlelogo.png'}
					alt={'Google Logo'}
					fill
					className="object-contain"
				/>
			</div>
			<div className="w-full grow rounded-[24px] bg-[#303134] py-3 px-5 font-sans text-[#e8eaed]">
				<span className="whitespace-nowrap">
					How do I index my discord channels into google?
				</span>
			</div>
		</div>
	);
};
