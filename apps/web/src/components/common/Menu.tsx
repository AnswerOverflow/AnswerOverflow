import Link from "next/link";

interface Props {
  menuItems: {
    title: string;
    url: string;
  }[];
}

const Menu = ({ menuItems }: Props) => {
  return (
    <ul className="flex flex-col sm:flex-row items-end sm:items-center gap-[22px] md:gap-28 ">
      {menuItems.map((item, index) => (
        <li key={index}>
          <Link
            href={item.url}
            className="text-[#475467] text-base not-italic font-semibold leading-6 underline font-montserrat"
          >
            {item.title}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default Menu;
