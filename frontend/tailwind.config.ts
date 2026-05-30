import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A1A2E',
        accent: '#5B4FE9',
        background: '#F7F8FC',
        surface: '#FFFFFF',
        danger: '#E53E3E',
        success: '#38A169',
        slate: {
          950: '#0F172A',
        }
      },
    },
  },
  plugins: [],
};

export default config;