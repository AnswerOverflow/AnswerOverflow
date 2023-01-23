import "../src/styles/globals.css";

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
  tailwindDarkmode: {
    name: 'Theme',
    description: 'Light/Dark mode for components',
    toolbar: {
      icon: 'mirror',
      dynamicTitle: true,
      items: ['light', 'dark']
    }
  }
};

const withTailwind = (Story, context) => {
  const { tailwindDarkmode } = context.globals;
  const isDark = tailwindDarkmode === 'dark';
  document.querySelector('html').classList.toggle('dark', isDark);
  document.querySelector('body').className = 'dark:bg-neutral-800';
  return Story();
}

export const decorators = [withTailwind];
