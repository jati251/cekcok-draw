/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ps: {
          bg: '#18181b',
          surface: '#27272a',
          panel: '#202023',
          border: '#3f3f46',
          header: '#1e1e22',
          active: '#3b82f6',
          hover: '#333338',
          text: '#e4e4e7',
          muted: '#a1a1aa',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
