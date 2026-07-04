/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F3F0FF',
          100: '#E9E3FF',
          500: '#7C5CFC',
          600: '#6D4AE6',
        },
        surface: {
          bg: '#F4F4F6',
          card: '#FFFFFF',
          border: '#ECECF0',
          muted: '#8E8E98',
          text: '#1C1C22',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04)',
      },
    },
  },
  plugins: [],
}
