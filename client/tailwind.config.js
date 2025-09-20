/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // enable manual dark mode via .dark class
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
        screens: {
        'xs': '475px', // Petit mobile
        '3xl': '1680px', // Très grand écran
      },
      colors: {
        primary: {
          50: '#fdf3f3',
          100: '#fbe4e4',
          200: '#f5c3c4',
          300: '#eea0a2',
          400: '#e66d70',
          500: '#dc4145',
          600: '#cf292c', // main brand
          700: '#b61f22',
          800: '#921a1c',
          900: '#5a0f11'
        }
      }
    },
  },
  plugins: [],
}

