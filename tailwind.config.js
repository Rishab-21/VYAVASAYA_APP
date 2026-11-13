/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f3029',
        muted: '#849089',
        line: '#e8ebe5',
        canvas: '#f5f6f2',
        brand: {
          DEFAULT: '#1b5c45',
          50: '#f1f7f3',
          100: '#e8f3ed',
          200: '#dceee0',
          300: '#bdd4c4',
          400: '#81b39b',
          500: '#2d8060',
          600: '#1b5c45',
          700: '#164b39',
        },
        accent: {
          DEFAULT: '#e8a24d',
          light: '#fff3e7',
        },
        danger: {
          DEFAULT: '#c96655',
          light: '#fdeeec',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
