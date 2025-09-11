// tailwind.config.js
const tokens = require('./design-tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: tokens.colors, // <- expone surface, textPrimary, brand.navy, etc.
      // si quieres radius/spacing custom en el futuro, también desde tokens
    },
  },
  plugins: [],
};
