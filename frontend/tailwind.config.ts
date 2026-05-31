import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Redesigned palette: Obsidian background, Emerald primary, Teal secondary
        primary: {
          DEFAULT: '#10B981', // Emerald
          glow: '#4edea3',
          container: '#10B981',
        },
        secondary: {
          DEFAULT: '#06B6D4', // Teal/Cyan
          glow: '#4cd7f6',
          container: '#03b5d3',
        },
        background: '#0B0F17', // Carbon Graphite dark background
        surface: {
          DEFAULT: '#111827', // Card/Surface base
          container: '#191f31',
          low: '#151b2d',
          high: '#23293c',
          highest: '#2e3447',
          dim: '#0c1324',
          bright: '#33394c',
          lowest: '#070d1f',
        },
        accent: '#10B981',
        danger: '#EF4444',
        success: '#10B981',
        slate: {
          950: '#0B0F17',
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        hanken: ['Hanken Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
};

export default config;