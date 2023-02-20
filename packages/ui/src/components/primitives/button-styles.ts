import type { ClassValue } from "cva/dist/types";
import type { Entries } from "type-fest";

type Colors = "black" | "white";
type Styles = "solid" | "ghost";

export type ButtonStylesType = {
  [key in Colors]: {
    [key in Styles]: {
      default: ClassValue;
      disabled: ClassValue;
    };
  };
};

export const buttonStyles: ButtonStylesType = {
  white: {
    solid: {
      default: "bg-white text-black",
      disabled: "bg-gray-300 text-gray-500 border-2 border-black",
    },
    ghost: {
      default: "bg-transparent text-white border-1 border-white",
      disabled: "bg-gray-300 text-gray-500 border-1 border-white",
    },
  },
  black: {
    solid: {
      default:
        "bg-black text-white hover:bg-[#151D26] focus:outline-none focus:ring-2 focus:ring-[#0099FF]",
      disabled: "bg-gray-300 text-gray-500",
    },
    ghost: {
      default: "bg-transparent text-black border-1 border-black hover:bg-[#070A0D]/5",
      disabled: "bg-gray-300 text-gray-500 border-1 border-black",
    },
  },
};

type CompoundVariants = {
  type: Styles;
  color: Colors;
  className: ClassValue;
  disabled: boolean;
};

export const convertToCva = (styles: ButtonStylesType): CompoundVariants[] => {
  const cvaStyles: CompoundVariants[] = [];

  for (const [key, value] of Object.entries(styles) as Entries<typeof styles>) {
    for (const [key2, value2] of Object.entries(value) as Entries<typeof value>) {
      for (const [key3, value3] of Object.entries(value2) as Entries<typeof value2>) {
        if (key3 === "default") {
          cvaStyles.push({
            type: key2,
            color: key,
            className: value3,
            disabled: false,
          });
        } else if (key3 === "disabled") {
          cvaStyles.push({
            type: key2,
            color: key,
            className: value3,
            disabled: true,
          });
        }
      }
    }
  }

  return cvaStyles;
};
