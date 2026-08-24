import type { Config } from 'tailwindcss';
import sharedConfig from '@opensio/config/tailwind/tailwind.config';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  presets: [sharedConfig as Config],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
