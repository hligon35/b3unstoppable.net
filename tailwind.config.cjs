/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brandBlue: {
          DEFAULT: 'rgb(var(--color-brand-blue) / <alpha-value>)',
          dark: 'rgb(var(--color-brand-blue-dark) / <alpha-value>)',
          light: 'rgb(var(--color-brand-blue-light) / <alpha-value>)'
        },
        brandOrange: {
          DEFAULT: 'rgb(var(--color-brand-orange) / <alpha-value>)',
          dark: 'rgb(var(--color-brand-orange-dark) / <alpha-value>)',
          light: 'rgb(var(--color-brand-orange-light) / <alpha-value>)'
        },
        navy: 'rgb(var(--color-navy) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Oswald', 'Impact', 'Arial Black', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        script: ['Dancing Script', 'Brush Script MT', 'cursive']
      },
      spacing: {
        '15': '3.75rem', // 60px - 50% larger than h-10 w-10 (40px)
        '30': '7.5rem',  // 120px - double the current size
      }
    },
  },
  plugins: [],
};
