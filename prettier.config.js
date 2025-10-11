/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  // Rules from the new TanStack config
  semi: false,
  singleQuote: true,
  trailingComma: 'all',

  // Your existing, project-specific rules
  tabWidth: 2,
  printWidth: 80,
  endOfLine: 'auto',
  useTabs: false,
  arrowParens: 'avoid',

  // Your essential Tailwind CSS plugin is retained
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindFunctions: ['clsx'],
  tailwindStylesheet: './src/index.css',
};

export default config;