/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ps: {
          bg: '#101114',
          pasteboard: '#2a2d35',
          panel: '#16171c',
          surface: '#1c1e24',
          header: '#131418',
          border: '#282b35',
          'border-subtle': '#20222a',
          active: '#3b82f6',
          'active-hover': '#2563eb',
          hover: '#22252e',
          text: '#f3f4f6',
          muted: '#9ca3af',
          dim: '#6b7280',
          accent: '#6366f1',
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
