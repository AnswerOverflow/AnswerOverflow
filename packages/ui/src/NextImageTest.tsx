import Image from "next/image";

export const NextImageTest = () => {
  // Bit of a hack that may be revisiting but wrap the next image component with this to work with storybook
  return (
    <Image
      src="https://www.answeroverflow.com/content/branding/meta_header.png"
      width={1200}
      height={628}
      alt="Answer Overflow Logo"
    />
  );
};
