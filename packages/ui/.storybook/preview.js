import "../src/styles/globals.css";
import {WithTailwindTheme, WithTRPC} from "../src/utils/decorators"


export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

export const globalTypes = {
  tailwind_theme: {
    name: 'Theme',
    description: 'Light/Dark mode for components',
    toolbar: {
      icon: 'mirror',
      dynamicTitle: true,
      items: ['light', 'dark', 'both']
    }
  },
  auth_state: {
    name: "Auth State",
    description: "Toggle between signed in and not signed in",
    toolbar: {
      icon: "user",
      dynamicTitle: true,
      items: ['signed_in', 'signed_out']
    }
  }
};


export const decorators = [WithTailwindTheme, WithTRPC];
