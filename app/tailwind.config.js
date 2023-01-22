/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FFFFFF',
        secondary: '#A4A4A4',
        accent: '#2C2C2C',
        background: '#0D0D0D'
      }
    },
    fontFamily: {
      gothicA1: ['Gothic A1', 'sans-serif']
    }
  },
  plugins: []
};
