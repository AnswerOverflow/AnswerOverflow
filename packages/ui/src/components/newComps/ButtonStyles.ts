import type { Entries } from "type-fest";

type Colors = "black" | "white";
type Styles = "solid" | "ghost";

export type ButtonStylesType = {
  [key in Colors]: {
    [key in Styles]: {
      default: string;
      disabled: string;
    };
  };
};

export const ButtonStyles: ButtonStylesType = {
  white: {
    solid: {
      default: "bg-white text-black",
      disabled: "bg-gray-300 text-gray-500 border-2 border-black",
    },
    ghost: {
      default: "bg-black text-white",
      disabled: "bg-gray-300 text-gray-500 border-2 border-black",
    },
  },
  black: {
    solid: {
      default: "bg-black text-white",
      disabled: "bg-gray-300 text-gray-500",
    },
    ghost: {
      default: "bg-black text-white",
      disabled: "bg-gray-300 text-gray-500",
    },
  },
};

type compoundVariants = {
  type: Styles;
  color: Colors;
  className: string;
  disabled: boolean;
};

export const convertToCva = (styles: ButtonStylesType): compoundVariants[] => {
  const cvaStyles: compoundVariants[] = [];

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
