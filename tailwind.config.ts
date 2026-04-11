import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fff9f4',
        rose: '#f8e6eb',
        blush: '#f4d9dd',
        ink: '#2a2124'
      }
    }
  },
  plugins: []
};

export default config;
