/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#D6E4FF',
          100: '#D6E4FF',
          200: '#ADC8FF',
          300: '#84A9FF',
          400: '#6690FF',
          500: '#3366FF',
          600: '#254EDB',
          700: '#1939B7',
          800: '#102693',
          900: '#091A7A',
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
