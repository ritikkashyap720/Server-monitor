/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme with green tint
        dark: {
          950: '#061210',
          900: '#0a1614',
          800: '#0f1c1a',
          700: '#152420',
          600: '#1c2e2a',
          500: '#243b36',
        },
        // Dark green accent palette
        accent: {
          DEFAULT: '#34d399',
          dim: '#10b981',
          light: '#6ee7b7',
          muted: '#059669',
        },
        surface: {
          DEFAULT: '#0f1c1a',
          hover: '#152420',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgb(52 211 153 / 0.25)',
        'glow-sm': '0 0 12px -3px rgb(52 211 153 / 0.2)',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
};
