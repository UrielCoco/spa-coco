/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(222 47% 11%)',
        card: 'hsl(0 0% 100%)',
        muted: 'hsl(210 40% 96%)',
        border: 'hsl(214 32% 91%)',
        primary: 'hsl(221 83% 53%)',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        soft: '0 4px 16px rgba(0,0,0,0.08)',
      }
    },
  },
  plugins: [],
}
