/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ps: {
          bg: 'rgb(var(--ps-bg) / <alpha-value>)',
          pasteboard: 'rgb(var(--ps-pasteboard) / <alpha-value>)',
          panel: 'rgb(var(--ps-panel) / <alpha-value>)',
          surface: 'rgb(var(--ps-surface) / <alpha-value>)',
          header: 'rgb(var(--ps-header) / <alpha-value>)',
          border: 'rgb(var(--ps-border) / <alpha-value>)',
          'border-subtle': 'rgb(var(--ps-border-subtle) / <alpha-value>)',
          active: 'rgb(var(--ps-active) / <alpha-value>)',
          'active-hover': 'rgb(var(--ps-active-hover) / <alpha-value>)',
          hover: 'rgb(var(--ps-hover) / <alpha-value>)',
          text: 'rgb(var(--ps-text) / <alpha-value>)',
          muted: 'rgb(var(--ps-muted) / <alpha-value>)',
          dim: 'rgb(var(--ps-dim) / <alpha-value>)',
          accent: 'rgb(var(--ps-accent) / <alpha-value>)',
        },
        zinc: {
          50: 'rgb(var(--zinc-50) / <alpha-value>)',
          100: 'rgb(var(--zinc-100) / <alpha-value>)',
          200: 'rgb(var(--zinc-200) / <alpha-value>)',
          300: 'rgb(var(--zinc-300) / <alpha-value>)',
          400: 'rgb(var(--zinc-400) / <alpha-value>)',
          500: 'rgb(var(--zinc-500) / <alpha-value>)',
          600: 'rgb(var(--zinc-600) / <alpha-value>)',
          700: 'rgb(var(--zinc-700) / <alpha-value>)',
          800: 'rgb(var(--zinc-800) / <alpha-value>)',
          850: 'rgb(var(--zinc-850) / <alpha-value>)',
          900: 'rgb(var(--zinc-900) / <alpha-value>)',
          950: 'rgb(var(--zinc-950) / <alpha-value>)',
        },
      },
      boxShadow: {
        studio: '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
        'studio-subtle': '0 2px 10px rgba(0, 0, 0, 0.3)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
