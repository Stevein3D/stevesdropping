/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#fdf6e3',
          card:    '#fff8ee',
          border:  '#e0c89a',
          subtle:  '#ecdab0',
        },
        steve: {
          DEFAULT: '#c94a1a',
          hover:   '#a83a12',
        },
        warm: {
          900: '#2a1a08',
          800: '#1a1008',
          700: '#3d2a10',
          600: '#7a5230',
          500: '#c4956a',
          400: '#8a6040',
          200: '#f0e2c4',
          100: '#f0e0c0',
          50:  '#fff8ee',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans:  ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
