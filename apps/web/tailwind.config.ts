import type { Config } from 'tailwindcss';

const baseConfig = require('@funbreakseo/config/tailwind');

const config: Config = {
  ...baseConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
};

export default config;
